import { useEffect, useRef, useState } from 'react';
import { moveCursor, listenForCursorUpdates, cleanupListeners } from '../services/io';


export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    id: string;
    type: 'line' | 'rect' | 'circle';
    points: Point[];
    color: string;
    width: number;
    userId: string;
    timestamp: number;
}

interface RemoteCursorUpdate {
    nickname: string;
    point: Point;
}


interface CanvasProps {
    userId: string;
    userName: string;
    roomId: string;
    onStrokeComplete?: (stroke: Stroke) => void;
}

export default function Canvas({ userId, userName, roomId, onStrokeComplete }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pendingCursorRef = useRef<Point | null>(null);
    const sendRafRef = useRef<number | null>(null);
    const pendingRemoteRef = useRef<Record<string, Point>>({});
    const receiveRafRef = useRef<number | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(2);
    const [tool, setTool] = useState<'line'>('line');
    const [activeTool, setActiveTool] = useState<'draw' | 'eraser'>('draw');
    const [mousePosition, setMousePosition] = useState<Point | null>(null);
    const [isHovering, setIsHovering] = useState(true);
    const [remoteCursors, setRemoteCursors] = useState<Record<string, Point>>({});

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            redrawCanvas();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        listenForCursorUpdates((data: RemoteCursorUpdate) => {
            if (!data?.nickname || !data?.point) return;
            if (data.nickname === userName) return;

            pendingRemoteRef.current[data.nickname] = data.point;
            if (receiveRafRef.current !== null) return;

            receiveRafRef.current = requestAnimationFrame(() => {
                receiveRafRef.current = null;
                const batched = pendingRemoteRef.current;
                pendingRemoteRef.current = {};

                setRemoteCursors(prev => ({
                    ...prev,
                    ...batched,
                }));
            });
        });

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cleanupListeners();
            if (sendRafRef.current !== null) {
                cancelAnimationFrame(sendRafRef.current);
            }
            if (receiveRafRef.current !== null) {
                cancelAnimationFrame(receiveRafRef.current);
            }
        };
    }, []);


    // Redraw all strokes on canvas
    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all saved strokes
        strokes.forEach(stroke => {
            drawStroke(ctx, stroke);
        });

        // Draw current stroke if drawing
        if (isDrawing && currentStroke.length > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            currentStroke.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }
    };

    // Draw a single stroke
    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.points.length === 0) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    };

    // Redraw whenever strokes or current stroke changes
    useEffect(() => {
        redrawCanvas();
    }, [strokes, currentStroke, isDrawing]);

    // Pointer event handlers (mouse, touch, pen)
    const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const point = getPointerPos(e);
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsHovering(true);

        if (activeTool === 'eraser') {
            handleErase(point);
        } else {
            setIsDrawing(true);
            setCurrentStroke([point]);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const point = getPointerPos(e);
        setMousePosition(point);
        pendingCursorRef.current = point;

        if (sendRafRef.current === null) {
            sendRafRef.current = requestAnimationFrame(() => {
                sendRafRef.current = null;
                if (pendingCursorRef.current) {
                    moveCursor(roomId, userId, userName, pendingCursorRef.current);
                }
            });
        }

        if (activeTool === 'eraser' && isDrawing) {
            handleErase(point);
        } else if (isDrawing) {
            setCurrentStroke(prev => [...prev, point]);
        }
    };

    const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'mouse') {
            setIsHovering(true);
        }
    };

    const handlePointerLeaveCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'mouse') {
            setIsHovering(false);
            setMousePosition(null);
        }
    };

    const handleErase = (point: Point) => {
        // Delete entire stroke if clicked on it
        const strokeToDelete = strokes.find(stroke =>
            isPointNearStroke(point, stroke, width) // Use current width as tolerance
        );

        if (strokeToDelete) {
            setStrokes(prev => prev.filter(s => s.id !== strokeToDelete.id));
        }
        
        setIsDrawing(true);
    };

    // Helper function to check if point is near another point
    const isPointNear = (p1: Point, p2: Point, threshold: number): boolean => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    };

    // Helper function to check if point is near a stroke
    const isPointNearStroke = (point: Point, stroke: Stroke, threshold: number): boolean => {
        return stroke.points.some(p => isPointNear(point, p, threshold));
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        setIsDrawing(false);
        setIsHovering(false);
        setMousePosition(null);

        if (activeTool === 'eraser') {
            // Don't create strokes for eraser
            return;
        }

        // Create stroke object
        const stroke: Stroke = {
            id: `${userId}-${Date.now()}`,
            type: tool,
            points: currentStroke,
            color,
            width,
            userId,
            timestamp: Date.now(),
        };

        setStrokes(prev => [...prev, stroke]);
        setCurrentStroke([]);

        // Callback for socket communication
        if (onStrokeComplete) {
            onStrokeComplete(stroke);
        }
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'mouse') {
            handlePointerLeaveCanvas(e);
        }
        if (isDrawing) {
            handlePointerUp(e);
        }
    };

    const clearCanvas = () => {
        setStrokes([]);
        setCurrentStroke([]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 p-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Tool:</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTool('draw')}
                            className={`px-3 py-2 border rounded cursor-pointer transition-colors ${
                                activeTool === 'draw' 
                                    ? 'bg-cyan-400 text-white border-cyan-400' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                            title="Draw"
                        >
                            <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button
                            onClick={() => setActiveTool('eraser')}
                            className={`px-3 py-2 border rounded cursor-pointer transition-colors ${
                                activeTool === 'eraser' 
                                    ? 'bg-cyan-400 text-white border-cyan-400' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                            title="Eraser"
                        >
                            <i className="fa-solid fa-eraser"></i>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Type:</label>
                    <select
                        value={tool}
                        onChange={(e) => setTool(e.target.value as 'line')}
                        className="px-3 py-2 border border-gray-300 rounded cursor-pointer text-sm text-gray-700"
                    >
                        <option value="line">Line</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Color:</label>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                        disabled={activeTool === 'eraser'}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                        {activeTool === 'eraser' ? 'Radius:' : 'Width:'}
                    </label>
                    <input
                        type="range"
                        min="3"
                        max="20"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-sm text-gray-600 w-8">{width}px</span>
                </div>

                <button
                    onClick={clearCanvas}
                    className="ml-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium cursor-pointer"
                >
                    Clear Canvas
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    className={`absolute inset-0 w-full h-full ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                    style={{
                        touchAction: 'none',
                        ...(activeTool === 'eraser' ? {
                            cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${width * 2 + 4}' height='${width * 2 + 4}' viewBox='0 0 ${width * 2 + 4} ${width * 2 + 4}'><circle cx='${width + 2}' cy='${width + 2}' r='${width}' fill='none' stroke='black' stroke-width='1'/></svg>") ${width + 2} ${width + 2}, auto`
                        } : {})
                    }}
                />
                
                {/* Current user's nickname label */}
                {isHovering && mousePosition && (
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            left: `${mousePosition.x}px`,
                            top: `${mousePosition.y + 20}px`,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {userName}
                        </div>
                    </div>
                )}
                
                {Object.entries(remoteCursors).map(([nickname, point]) => (
                    <div
                        key={nickname}
                        className="absolute pointer-events-none"
                        style={{ left: point.x, top: point.y }}
                    >
                        <div className="relative translate-x -translate-y-4">
                            <div className="absolute left-1/2 top-1/2 w-4 h-px bg-black/80 -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute left-1/2 top-1/2 h-4 w-px bg-black/80 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="bg-black/75 text-white text-xs px-2 py-1 rounded">
                            {nickname}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

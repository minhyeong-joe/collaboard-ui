import { act, useEffect, useRef, useState } from 'react';

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

// Data schema for users
export interface User {
    id: string;
    name: string;
    color: string;
    cursor?: Point;
}

interface CanvasProps {
    userId: string;
    userName: string;
    roomId: string;
    onStrokeComplete?: (stroke: Stroke) => void;
}

export default function Canvas({ userId, userName, roomId, onStrokeComplete }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(2);
    const [tool, setTool] = useState<'line'>('line');
    const [activeTool, setActiveTool] = useState<'draw' | 'eraser'>('draw');
    const [mousePosition, setMousePosition] = useState<Point | null>(null);
    const [isHovering, setIsHovering] = useState(true);

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

        return () => window.removeEventListener('resize', resizeCanvas);
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

    // Mouse event handlers
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);

        if (activeTool === 'eraser') {
            handleErase(point);
        } else {
            setIsDrawing(true);
            setCurrentStroke([point]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);
        setMousePosition(point);

        if (activeTool === 'eraser' && isDrawing) {
            handleErase(point);
        } else if (isDrawing) {
            setCurrentStroke(prev => [...prev, point]);
        }
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    const handleMouseLeaveCanvas = () => {
        setIsHovering(false);
        setMousePosition(null);
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

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

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

    const handleMouseLeave = () => {
        if (isDrawing) {
            handleMouseUp();
        }
        handleMouseLeaveCanvas();
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
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`absolute inset-0 w-full h-full ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                    style={activeTool === 'eraser' ? { 
                        cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${width * 2 + 4}' height='${width * 2 + 4}' viewBox='0 0 ${width * 2 + 4} ${width * 2 + 4}'><circle cx='${width + 2}' cy='${width + 2}' r='${width}' fill='none' stroke='black' stroke-width='1'/></svg>") ${width + 2} ${width + 2}, auto` 
                    } : undefined}
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
                
                {/* TODO: When socket is wired up, map over other users' cursors and nicknames */}
                {/* {otherUsers.map(user => user.cursor && (
                    <div key={user.id} className="absolute pointer-events-none" style={{ left: user.cursor.x, top: user.cursor.y + 20 }}>
                        <div className="bg-black/75 text-white text-xs px-2 py-1 rounded">{user.name}</div>
                    </div>
                ))} */}
            </div>
        </div>
    );
}

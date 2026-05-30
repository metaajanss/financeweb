/**
 * Ambient module declaration for the `canvas` package (v3.x).
 * The package ships native bindings that may not be compiled in all
 * environments (CI, edge runtimes). This declaration lets TypeScript resolve
 * the import and type-check call sites without requiring the package to be
 * compiled, while still using the real typings when the package IS installed.
 */
declare module 'canvas' {
    interface CanvasInstance {
        getContext(type: '2d'): CanvasRenderingContext2D;
        toBuffer(format?: string): Buffer;
        width: number;
        height: number;
    }

    interface NodeCanvasImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
    }

    export function createCanvas(width: number, height: number): CanvasInstance;
    export function createImageData(
        data: Uint8ClampedArray,
        width: number,
        height?: number,
    ): NodeCanvasImageData;
}

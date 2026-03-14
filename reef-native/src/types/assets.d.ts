/**
 * Type declarations for asset imports.
 * Allows TypeScript to understand require() calls for images and other assets.
 */

declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

declare module '*.gif' {
  const value: number;
  export default value;
}

declare module '*.svg' {
  const value: number;
  export default value;
}

declare module '*.mp4' {
  const value: number;
  export default value;
}

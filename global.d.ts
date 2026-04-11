/// <reference types="next" />
/// <reference types="next/image-types/global" />

// CSS module declarations — required for TypeScript to accept CSS imports
declare module '*.css' {
  const styles: { [className: string]: string }
  export default styles
}

// Asset declarations
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}

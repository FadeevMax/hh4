// This is a special file that prevents static prerendering of pages
// It forces Next.js to use Server-Side Rendering instead

export const config = {
  unstable_runtimeJS: true,
  unstable_JsPreload: false
}; 
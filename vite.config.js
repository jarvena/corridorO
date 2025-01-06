export default {
  base: '/corridorO/',
  build: {
    sourcemap: true,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  }
}

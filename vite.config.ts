export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '')
  return {
    base: '/',
    plugins: [react()],
  }
})

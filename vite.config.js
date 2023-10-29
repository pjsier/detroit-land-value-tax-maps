export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "maplibre-gl": ["maplibre-gl"],
        },
      },
    },
  },
}

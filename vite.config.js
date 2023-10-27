export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pmtiles: ["pmtiles"],
          "maplibre-gl": ["maplibre-gl"],
        },
      },
    },
  },
}

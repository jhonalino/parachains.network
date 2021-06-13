module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/ksm/crowdloans',
        permanent: false,
      },
    ]
  },
}

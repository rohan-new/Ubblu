const colorgenerator = () => {
  let letters = 'BCDEF'.split(''),
    color = ''
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)]
  }
  return color
}

module.exports = colorgenerator
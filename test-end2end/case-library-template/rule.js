module.exports = {
  instructions: [
    {
      locations: ['http://localhost:8080'],
      expression: "document.querySelector('#hptl a').href"
    },
    {
      locations: context => context.instructionResults[0],
      expression: "document.title"
    }
  ],
  output: context => context.instructionResults[1][0]
}

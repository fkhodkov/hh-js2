const machines = []

const machine = factory => ({
  context: factory.context,
  stateId: factory.initialState,
  getAction(action) { return factory.actions[action] },
  getState() { return factory.states[this.stateId] },
  transition(action, event) {
    machines.push(this)
    const currentState = this.getState()
    const response = currentState.on[action]
    if (response.service) {
      response.service(event)
    } else if (response.target) {
      const [state, setState] = useState()
      if (state !== response.target)
        setState(response.target)
    }
    machines.pop()
  },
})

function useContext () {
  if (machines.length === 0)
    throw new Error("useContext should be run only from state machine")
  const machine = machines[machines.length-1]
  return [
    machine.context,
    arg => { Object.assign(machine.context, arg) }
  ]
}

function useState () {
  if (machines.length === 0)
    throw new Error("useState should be run only from state machine")
  const machine = machines[machines.length-1]
  const currentState = machine.getState()
  function runHooks(f) {
    if (!f) return;
    if (typeof f === 'string' || f instanceof String) {
      machine.getAction(f)()
    } else if (Array.isArray(f)) {
      f.forEach(arguments.callee)
    } else {
      f()
    }
  }
  return [
    machine.stateId,
    function (arg) {
      if (arg !== machine.stateId) {
        machines.push(machine)
        runHooks(currentState.onExit)
        machine.stateId = arg
        const newState = machine.getState()
        runHooks(newState.onEntry)
        machines.pop()
      }
    }
  ]
}

export { machine, useContext, useState }

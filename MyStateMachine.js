const envStack = []

function withEnv(env, func, ...args) {
  envStack.push(env)
  func(...args)
  envStack.pop()
}

const machine = factory => ({
  context: factory.context,
  stateId: factory.initialState,
  getAction(action) { return factory.actions[action] },
  getState() { return factory.states[this.stateId] },
  transition(action, event) {
    const currentState = this.getState()
    const response = currentState.on[action]
    if (response.service) {
      withEnv({machine: this, event: event}, response.service, event)
    } else if (response.target) {
      withEnv({machine: this, event: event}, () => {
        const [state, setState] = useState()
        if (state !== response.target)
          setState(response.target)
      })
    }
  },
})

function useContext () {
  if (envStack.length === 0)
    throw new Error("useContext should be run only from state machine")
  const {machine} = envStack[envStack.length-1]
  return [
    machine.context,
    arg => { Object.assign(machine.context, arg) }
  ]
}

function useState () {
  if (envStack.length === 0)
    throw new Error("useState should be run only from state machine")
  const {machine, event} = envStack[envStack.length-1]
  const currentState = machine.getState()
  return [
    machine.stateId,
    function (arg) {
      function runHooks(f) {
        if (!f) return;
        if (typeof f === 'string' || f instanceof String) {
          withEnv({machine: machine, event: event}, machine.getAction(f), event)
        } else if (Array.isArray(f)) {
          withEnv({machine: machine, event: event}, () => f.forEach(runHooks))
        } else {
          withEnv({machine: machine, event: event}, f, event)
        }
      }
      if (arg !== machine.stateId) {
        withEnv({machine: machine, event: event}, () => {
          runHooks(currentState.onExit)
          machine.stateId = arg
          const newState = machine.getState()
          runHooks(newState.onEntry)
        })
      }
    }
  ]
}

export { machine, useContext, useState }

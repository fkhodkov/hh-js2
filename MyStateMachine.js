const envStack = []

function withEnv(env, func, ...args) {
  envStack.push(env)
  func(...args)
  envStack.pop()
}

function getEnv(f) {
  if (envStack.length === 0)
    throw new Error(`${f.name} should be run only from state machine`)
  return envStack[envStack.length-1]
}

function useContext () {
  const {machine} = getEnv(useContext)
  return [
    machine.context,
    arg => { Object.assign(machine.context, arg) }
  ]
}

function useState () {
  const {machine, event} = getEnv(useState)
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
          machine.setState(arg)
          const newState = machine.getState()
          runHooks(newState.onEntry)
        })
      }
    }
  ]
}

const machine = factory => ({
  context: factory.context,
  stateId: factory.initialState,
  getAction(action) { return factory.actions[action] },
  getState() { return factory.states[this.stateId] },
  setState(newStateId) {
    if (factory.states[newStateId])
      this.stateId = newStateId
    else
      throw new Error(`State ${newStateId} doesn't exist`)
  },
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

export { machine, useContext, useState }

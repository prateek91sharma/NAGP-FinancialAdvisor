function carryForwardSameContext(agent, contextName) {
    const context = agent.context.get(contextName);
    if (context) {
        agent.setContext({ name: contextName, lifespan: 5, parameters: context?.parameters });
    }
}

function carryForwardDifferentContext(agent, inContextName, outContextName) {
    const context = agent.context.get(inContextName);
    agent.setContext({ name: outContextName, lifespan: 5, parameters: context?.parameters })
}

module.exports = {
    carryForwardSameContext,
    carryForwardDifferentContext
}
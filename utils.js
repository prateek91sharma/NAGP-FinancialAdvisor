const { Card, Suggestion, Payload } = require('dialogflow-fulfillment');

function carryForwardSameContext(agent, contextName) {
    const context = agent.context.get(contextName);
    if (context) {
        agent.context.set({ name: contextName, lifespan: 5, parameters: context?.parameters });
    }
}

function carryForwardDifferentContext(agent, inContextName, outContextName) {
    const context = agent.context.get(inContextName);
    agent.context.set({ name: outContextName, lifespan: 5, parameters: context?.parameters })
}
function createSuggestionFromList(agent, list){
    list.forEach(item => {
        agent.add(new Suggestion(item.toString()));
    });
}

function clearAllContexts(agent){
    const currentContexts = agent.contexts;

    currentContexts.forEach(ctx => {
      agent.context.set({
        name: ctx.name,
        lifespan: 0
      });
    });
    console.log('All contexts cleared.');
}

function renderAsTelegramHTMLPayload(agent, htmlContent, replies) {
    var telegramPayload = {
        telegram: {
            text: htmlContent,
            parse_mode: 'HTML'/* ,
            reply_markup: {
                keyboard: [['Yes'], ['No']],
                resize_keyboard: true,
                one_time_keyboard: true
            } */
        }
    };
    if (replies && replies.length !== 0) {
        const replyMarkup = {
            keyboard: replies.map(o => Array.of(o)),
            resize_keyboard: true,
            // one_time_keyboard: true
        }
        telegramPayload.telegram = {
            ...telegramPayload.telegram,
            reply_markup: replyMarkup
        };
    }
    agent.add(new Payload(agent.TELEGRAM, telegramPayload, { rawPayload: true, sendAsMessage: true }));
}

module.exports = {
    renderAsTelegramHTMLPayload,
    carryForwardSameContext,
    carryForwardDifferentContext,
    createSuggestionFromList,
    clearAllContexts
}
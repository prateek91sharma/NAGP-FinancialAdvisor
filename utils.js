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

function renderAsTelegramPayload(agent, htmlContent, replies, type) {
    var telegramPayload = {
        telegram: {
            text: htmlContent,
            parse_mode: type ? type : 'HTML'
        }
    };
    if (replies && replies.length !== 0) {
        const replyMarkup = {
            keyboard: replies.map(o => Array.of(o)),
            resize_keyboard: true,
            one_time_keyboard: true,
            is_persistent: true,
            input_field_placeholder: 'Click icon on right for options'
        }
        telegramPayload.telegram = {
            ...telegramPayload.telegram,
            reply_markup: replyMarkup
        };
    } else {
        const replyMarkup = {
            remove_keyboard: true
        }
        telegramPayload.telegram = {
            ...telegramPayload.telegram,
            reply_markup: replyMarkup
        };
    }
    agent.add(new Payload(agent.TELEGRAM, telegramPayload, { rawPayload: true, sendAsMessage: true }));
}

function createTelegramSuggestionFromList(agent, header, list, errorMsg){
    const errorMsgHtml= errorMsg? `_${errorMsg}_\n\n`:'';
    renderAsTelegramPayload(agent, `${errorMsgHtml}*${header}*\n`+list.map((o) => `\u2022 `+ o).join("\n")+ `\nChoose an item\n`, list, 'Markdown');
}

function createTelegramListWithFreeTextSupport(agent, header, list, errorMsg){
    const errorMsgHtml= errorMsg? `_${errorMsg}_\n\n`:'';
    renderAsTelegramPayload(agent, `${errorMsgHtml}*${header}*\n`+list.map((o) => `\u2022 `+ o).join("\n")+ `\nEnter amount or choose from list\n`, list, 'Markdown');
}

module.exports = {
    renderAsTelegramPayload,
    carryForwardSameContext,
    carryForwardDifferentContext,
    createSuggestionFromList,
    clearAllContexts,
    createTelegramSuggestionFromList,
    createTelegramListWithFreeTextSupport
}
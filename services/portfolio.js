const files = require('./files');
const moment = require('moment');
const utils = require('../utils');
const invalidPortfolio = "Invalid Portfolio entered!!!\n";
const enterPortFolioMsg = "Kindly select one of your portfolios.\n";
function setupFolioIntents(intentMap) {
    intentMap.set('Folio_Entered_By_User', validateFolioAndRespond);

}
function validateFolioAndRespond(agent) {
    const phone = agent.context.get('portfolio_flow_started')?.parameters?.phone;
    const folio = agent.parameters.folioNumber;
    console.log('Inside Folio_Entered_By_User callback', phone, folio);
    const transations = files.getTransactionsByPortfolio(phone.toString(), folio);
    console.log('Txs found', transations);
    if (transations.length !== 0) {
        const totalAmount = transations.reduce((acc, tx) => tx.amount + acc, 0);
        const date = moment().format("YYYY-MM-DD");
        agent.add(`Your Portfolio ${folio} valuation is ${totalAmount} on ${date}\n`);
        agent.end('Thanks for using our services.!');
        utils.clearAllContexts(agent);
    } else {
        const folios = files.getFolioList(phone);
        getFolioResponse(agent, phone, folios, true);
    }
}
function getFolioResponse(agent, phone, folios, invalid) {
    const msg = invalid ? invalidPortfolio + enterPortFolioMsg : enterPortFolioMsg;
    agent.add(msg);
    utils.createSuggestionFromList(agent, folios);
    agent.context.set({ name: "portfolio_flow_started", lifespan: 5, parameters: { 'phone': phone.toString() } });
    agent.context.delete('contact_info_asked');
}


module.exports = {
    getFolioResponse,
    setupFolioIntents
};
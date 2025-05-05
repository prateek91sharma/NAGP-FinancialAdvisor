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
    const transations = files.getTransactionsByPortfolio(phone, folio);
    if (transations) {
        const totalAmount = transations.reduce((acc, tx) => tx.amount + acc, 0);
        const date = moment().format("YYYY-MM-DD");
        agent.add(`Your Portfolio ${folio} valuation is ${totalAmount} on ${date}\n`);
        agent.end('Thanks for using our services.!');
    } else {
        const folios = files.getFolioList(phone);
        getFolioResponse(agent, phone, folios, true);
    }
}
function getFolioResponse(agent, phone, folios, invalid) {
    const msg = invalid ? invalidPortfolio + enterPortFolioMsg : enterPortFolioMsg;
    agent.add(msg);
    folios.forEach(item => {
        agent.add(new Suggestion(item));
    });
    agent.setContext({ name: "portfolio_flow_started", lifespan: 5, parameters: { 'phone': phone } });
}


module.exports = {
    getFolioResponse,
    setupFolioIntents
};
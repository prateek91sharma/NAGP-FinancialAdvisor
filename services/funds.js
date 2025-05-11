const { Card, Suggestion, Payload } = require('dialogflow-fulfillment');
const funds = require('../static_data/fund&category.json');
const retryMsg = `I didn\'t understand. Can you try again?\n`;
const fundCatSelectionMsg = `Kindly select one of categories to see funds:\n`;
const fundSelectionMsg = `Select one of below fund:\n`;
const fundDetails = `Selected Fund Details:\n
It has ratio as 30%(Debt)-30%(Large Cap Equity)\n-20%(Mid Cap Equity)\n-20%(Small Cap Equity) with a 15% CAGR.\n\n
For more details: https-external-dummy-link`;
const fundQuantity = `Enter amount in Rupees.`;
const invalidFundQuantity = `Invalid amount entered !!`;
const files = require('./files');
const utils = require('../utils');
const fundAmountSuggestions = ['1000', '2000', '3000', '4000'];




function setupFundsIntents(intentMap) {
    intentMap.set('Fund_Explorer_Selected', fundsExplorerServiceSelected);
    intentMap.set('Fund_Explorer_Selected_Fallback', fundsExplorerServiceSelectedFallback);
    intentMap.set('Show_Funds_List', showFundsList);
    intentMap.set('Show_Funds_List_Fallback', showFundsListFallback);
    intentMap.set('Selected_Fund_Details', showSelectedFundDetails);
    intentMap.set('Selected_Fund_Details_Fallback', showSelectedFundDetailsFallback);
    intentMap.set('Go_Back_To_Categories_Menu', fundsExplorerServiceSelected);
    intentMap.set('Is_Phone_Number_Provided', isPhoneNumberProvided);
    // intentMap.set('Fund_Amount_Displayed', fundAmountDiplayed);
    intentMap.set('Fund_Amount_Entered', fundAmountValidation);


}
function fundAmountValidation(agent) {
    const amount = agent.parameters.amount;
    const { phoneNumber, fundName } = agent.context.get('funds_amount_displayed')?.parameters;
    console.log('Intent Fund_Amount_Entered callback', phoneNumber, fundName);
    if (typeof amount === 'number' && amount > 0 && amount < 50000) {
        agent.add(`Thank you for choosing our services`);
        files.addTransaction({ "amount": amount, "fund_name": fundName }, phoneNumber.toString());
        agent.end('Goodbye!');
        utils.clearAllContexts(agent);
    }
    else {
        console.log('Invalid amount entered', amount);
        addAmountQuickSuggestions(agent, true);
        agent.context({ name: 'funds_amount_displayed', lifespan: 5, parameters: { "phoneNumber": phoneNumber, "fundName": fundName } })
    }
}
// Will be redirected using this event FUND_PHONE_RECEIVED
function isPhoneNumberProvided(agent) {
    const phoneNumber = agent.context.get('phone-number-provided')?.parameters?.value || agent.parameters?.phone;//|| agent.context.get('funds_amount_displayed')?.parameters?.phoneNumber ;
    const fundName = agent.context.get('fund_details_shown')?.parameters?.fund || agent.parameters?.fundName;//|| agent.context.get('funds_amount_displayed')?.parameters?.fundName ;
    console.log('Last context', agent.context.get('fund_details_shown'));
    console.log('Intent Is_Phone_Number_Provided callback', phoneNumber, fundName);
    if (phoneNumber) {
        addAmountQuickSuggestions(agent);
        agent.context.set({ 'name': 'funds_amount_displayed', 'lifespan': 1, 'parameters': { 'phoneNumber': phoneNumber, 'fundName': fundName } });
    } else {
        // utils.clearAllContexts(agent);
        agent.context.set({name: 'services_displayed', lifespan: 1});
        agent.add('Transaction History');
        console.log('Redirecting to Portfolio_OR_Transaction_Selected intent', fundName);
        agent.setFollowupEvent({
            name: 'FUND_EXPLORER_MISSING_PHONE_NO',
            parameters: { 'fundName': fundName , 'service': ''},
        });
    }
}
function addAmountQuickSuggestions(agent, invalid) {
    agent.add(invalid ? (invalidFundQuantity + fundQuantity) : fundQuantity);
    utils.createSuggestionFromList(agent, fundAmountSuggestions);
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
//Also redirected using TRANSACTIONS_FOLLOWUP_EXPORE_FUNDS and NO_PORTFOLIO_EXPORE_FUNDS
// both pass phone number in value param
function fundsExplorerServiceSelected(agent) {
    const value = agent.parameters?.value;
    console.log("Inside Fund_Explorer_Selected or Go_Back_To_Categories_Menu callback ", value);
    agent.add(fundCategorySelectMsg());
    agent.context.set({name:'funds_category_displayed', lifespan: 1});
    if (value) {
        agent.context.set({ name: "phone-number-provided", lifespan:1, parameters: { 'value': value } });
    }
}
function fundsExplorerServiceSelectedFallback(agent) {
    agent.add(retryMsg + fundCategorySelectMsg());
    agent.context.set({name: 'funds_category_displayed', lifespan: 1});
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showFundsList(agent) {
    const category = agent.parameters.category;
    const filteredFunds =funds.filter((o) => o.category == category)
    .flatMap(o => o.funds.map(o => o.fund_name));
    agent.add(fundSelectionMsg);
    utils.createSuggestionFromList(agent, filteredFunds);
    agent.context.set({ 'name': 'funds_list_displayed', lifespan:1, 'parameters': { 'category': category } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showFundsListFallback(agent) {
    const category = agent.parameters.category;
    fundsQuickSuggestion(agent, category);
    agent.context.set({name: 'funds_list_displayed', lifespan: 1});
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function fundsQuickSuggestion(agent, category) {
    agent.add(fundSelectionMsg);
    const filteredFunds = funds.filter((o) => o.category == category).map(o => o.funds.map(o => o.fund_name));
    utils.createSuggestionFromList(agent, filteredFunds);
    utils.carryForwardSameContext(agent, "phone-number-provided");
}

function fundCategorySelectMsg() {
    return fundCatSelectionMsg +`- `+ funds.map((o) => o.category).join("\n- ")
}
function showFundListMsgText(category) {
    return fundSelectionMsg + funds.filter((o) => o.category == category).map(o => o.funds.map(o => o.fund_name)).join("\n- ")
}
function showSelectedFundDetails(agent) {
    const fundName = agent.parameters.fundName;
    console.log('Inside Selected_Fund_Details intent callback', fundName);
    agent.add(fundDetails);
    utils.createSuggestionFromList(agent, ['Invest', 'Return to Main menu']);
    agent.context.set({ name: 'fund_details_shown', lifespan: 2, parameters: { 'fund': fundName } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showSelectedFundDetailsFallback(agent) {
    const fundName = agent.parameters.fundName;
    agent.add(retryMsg + fundDetails);
    utils.createSuggestionFromList(agent, ['Invest', 'Return to Main menu']);
    agent.context.set({ name: 'fund_details_shown', lifespan:1, parameters: { 'fund': fundName } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function addAgentCards(category) {
    funds.filter((o) => o.category == category).map(o => o.funds.map(o => o.fund_name)).forEach(fund_name => {
        agent.add(new Card({
            title: fund_name,
            text: `- ${fund_name}`
        }));
    });
}
module.exports = {
    setupFundsIntents
};
const { Card} = require('dialogflow-fulfillment');
const funds = require('../static_data/fund&category.json');
const retryMsg = `I didn\'t understand. Can you try again?`;
const fundCatSelectionMsg = `Kindly select one of categories to see funds:`;
const fundSelectionMsg = `Select one of below fund:`;
const fundDetails = `Selected Fund Details:\n
It has ratio as 30%(Debt)-30%(Large Cap Equity)\n-20%(Mid Cap Equity)\n-20%(Small Cap Equity) with a 15% CAGR.\n\n
For more details: https-external-dummy-link`;
const fundDetailsHtml = `<b>Portfolio Allocation:</b>
• 30% (<i>Debt</i>)
• 30% (<i>Large Cap Equity</i>)
• 20% (<i>Mid Cap Equity</i>)
• 20% (<i>Small Cap Equity</i>)
<b>Expected CAGR:</b> 15%
For more details click <a href="https://groww.in/mutual-funds/dsp-large-mid-cap-fund-direct-plan-growth">here</a>
Choose an item below to continue`;
const fundQuantity = `Enter amount in Rupees`;
const invalidFundQuantity = `Invalid amount entered !!`;
const fundQuantityOutOfBounds = `Amount (is Rs.) must be greater than 0 uptil 50k !!`;
const files = require('./files');
const utils = require('../utils');
const fundAmountSuggestions = ['1000', '2000', '3000', '4000'];
const fundDetailsReplyOptions = ['Invest', 'Return to Main menu'];



function setupFundsIntents(intentMap) {
    intentMap.set('Fund_Explorer_Selected', fundsExplorerServiceSelected);
    intentMap.set('Fund_Explorer_Selected_Fallback', fundsExplorerServiceSelectedFallback);
    intentMap.set('Show_Funds_List', showFundsList);
    intentMap.set('Show_Funds_List_Fallback', showFundsListFallback);
    intentMap.set('Selected_Fund_Details', showSelectedFundDetails);
    intentMap.set('Selected_Fund_Details_Fallback', showSelectedFundDetailsFallback);
    intentMap.set('Go_Back_To_Categories_Menu', goBackToFundsMainMenu);
    intentMap.set('Is_Phone_Number_Provided', isPhoneNumberProvided);
    intentMap.set('Is_Phone_Number_Provided - fallback', isPhoneNumberProvidedFallback);
    // intentMap.set('Fund_Amount_Displayed', fundAmountDiplayed);
    intentMap.set('Fund_Amount_Entered', fundAmountValidation);
    intentMap.set('Fund_Amount_Entered - fallback', fundAmountValidationFallback);
    intentMap.set('Show_More_Funds_Confirmation', showMoreFundsPromptConfirmation);

}
function showMoreFundsPromptConfirmation(agent) {
    const confirmation = agent.parameters?.confirmation;
    const phone = agent.context.get('phone-number-provided')?.parameters?.value
    console.log("Inside Show_More_Funds_Confirmation Intent callback", confirmation, phone);
    if (confirmation === 'yes') {

        agent.add('');
        agent.context.set({ name: 'services_displayed', lifespan: 1 });
        utils.carryForwardSameContext(agent, 'phone-number-provided');
        agent.setFollowupEvent({
            name: 'INVEST_IN_MORE_FUNDS',
            languageCode: 'en',
            parameters: { 'value': phone }
        });
    }
    else if (confirmation === 'no') {
        agent.add('Thanks for using our services.');
        agent.end('Goodbye!!');
        utils.clearAllContexts(agent);
    }
}
function fundAmountValidationFallback(agent) {
    agent.add('Response unclear.\nYou can always start investing again by saying Hi! again.');
    agent.end('Goodbye for now!!');
    utils.clearAllContexts(agent);
}
function fundAmountValidation(agent) {
    const amount = agent.parameters.amount;
    const { phoneNumber, fundName } = agent.context.get('funds_amount_displayed')?.parameters;
    console.log('Intent Fund_Amount_Entered callback', phoneNumber, fundName);
    if (amount && Number(amount) > 0 && Number(amount) < 50000) {
        files.addTransaction({ "amount": Number(amount), "fund_name": fundName }, phoneNumber.toString());
        fundAmountValidPromptMsg(agent);
        agent.context.set({ name: 'fund_amount_invested', lifespan: 1 });
        agent.context.set({ name: "phone-number-provided", lifespan: 1, parameters: { 'value': phoneNumber } });
    }
    else {
        console.log('Out of bounds amount entered', amount);
        addAmountQuickSuggestions(agent, fundQuantityOutOfBounds);
        agent.context.set({ name: 'funds_amount_displayed', lifespan: 5, parameters: { "phoneNumber": phoneNumber, "fundName": fundName } })
    }
}
function fundAmountValidPromptMsg(agent) {
    //fundAmountValidPromptDialogFlowMsg(agent);
    fundAmountValidPromptTelegramMsg(agent);
}

function fundAmountValidPromptDialogFlowMsg(agent) {
    agent.add(`Thank you for choosing our services`);
    agent.end('Goodbye!');
    utils.clearAllContexts(agent);
}
function fundAmountValidPromptTelegramMsg(agent){
    utils.createTelegramSuggestionFromList(agent, `Thank you for choosing our services.\n\n\nDo you want to invest more for same mobile number?`,['Yes', 'No']);
}

// Will be redirected using this event FUND_PHONE_RECEIVED
function isPhoneNumberProvided(agent) {
    const phoneNumber = agent.context.get('phone-number-provided')?.parameters?.value || agent.parameters?.phone;//|| agent.context.get('funds_amount_displayed')?.parameters?.phoneNumber ;
    const fundName = agent.context.get('fund_details_shown')?.parameters?.fund || agent.parameters?.fundName;//|| agent.context.get('funds_amount_displayed')?.parameters?.fundName ;
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
function isPhoneNumberProvidedFallback(agent) {
    console.log('Intent Is_Phone_Number_Provided - fallback callback');
    addAmountQuickSuggestions(agent, invalidFundQuantity);
    utils.carryForwardSameContext(agent, 'funds_amount_displayed');
}
function addAmountQuickSuggestions(agent, invalidMsg) {
    // addAmountQuickSuggestionMsg(agent, invalid);
    const fundQuantityMarkup = fundQuantity+ '(less than 50K)';
    const err = invalidMsg? invalidMsg: '';
    utils.createTelegramListWithFreeTextSupport(agent, fundQuantityMarkup, fundAmountSuggestions , err)
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function addAmountQuickSuggestionMsg(agent, invalid){
    agent.add(invalid ? (invalidFundQuantity + fundQuantity) : fundQuantity);
    utils.createSuggestionFromList(agent, fundAmountSuggestions);
}

function goBackToFundsMainMenu(agent) {
    const phone = agent.context.get('phone-number-provided')?.parameters?.value
    console.log("Inside Go_Back_To_Categories_Menu callback ", phone);
    utils.clearAllContexts(agent);
    agent.context.set({name:'services_displayed', lifespan:1});
    agent.add('');
    agent.setFollowupEvent({
        name: 'GO_BACK_TO_MAIN_MENU',
        parameters: { 'value': phone }
    });
}

function handleFundsListResponse(agent, category, error) {
    const filteredFunds = funds.filter((o) => o.category == category)
        .flatMap(o => o.funds.map(o => o.fund_name));
    console.log('filteredFunds', filteredFunds)
    createFundsListMsg(agent, filteredFunds, error);
}

function createFundsListMsg(agent, filteredFunds, error){
    // createFundsListDialogFlowMsg(agent, filteredFunds);
    const errMsg = error ? retryMsg:'';
    utils.createTelegramSuggestionFromList(agent, fundSelectionMsg, filteredFunds, errMsg);
}
function createFundsListDialogFlowMsg(agent, filteredFunds){
    agent.add(fundSelectionMsg);
    utils.createSuggestionFromList(agent, filteredFunds);
}

function setFundCategorySelectMsg(agent, retryMsg) {
    // setFundCategorySelectDilogFlowMsg(agent, retryMsg);
    fundCategoryTelegramMsg(agent, retryMsg);
}
function setFundCategorySelectDilogFlowMsg(agent, retryMsg){
    var msg = fundCatSelectionMsg +`- `+ funds.map((o) => o.category).join("\n- ");
    msg = retryMsg? retryMsg + msg: msg;
    agent.add(msg);
    utils.createSuggestionFromList(agent, funds.map((o) => o.category));
}

function fundCategoryTelegramMsg(agent, retryMsg){
    const categories = funds.map((o) => o.category);
    utils.createTelegramSuggestionFromList(agent, fundCatSelectionMsg, categories, retryMsg? retryMsg:'');
}

function showFundListMsgText(category) {
    return fundSelectionMsg + funds.filter((o) => o.category == category).map(o => o.funds.map(o => o.fund_name)).join("\n- ")
}
function showSelectedFundDetailsMsg(agent){
    //showSelectedFundDetailsDialogFlowMsg(agent);
    showSelectedFundDetailsTelegramMsg(agent);
}
function showSelectedFundDetailsDialogFlowMsg(agent){
    agent.add(fundDetails);
    utils.createSuggestionFromList(agent, fundDetailsReplyOptions);
}
function showSelectedFundDetailsTelegramMsg(agent){
    utils.renderAsTelegramPayload(agent, fundDetailsHtml, fundDetailsReplyOptions)
}
function showSelectedFundDetailsFallback(agent) {
    const fundName = agent.parameters.fundName;
    console.log('Inside Selected_Fund_Details_Fallback intent callback', fundName);
    agent.add(retryMsg + fundDetails);
    utils.createSuggestionFromList(agent, fundDetailsReplyOptions);
    agent.context.set({ name: 'fund_details_shown', lifespan:1, parameters: { 'fund': fundName } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showSelectedFundDetails(agent) {
    const fundName = agent.parameters.fundName;
    console.log('Inside Selected_Fund_Details intent callback', fundName);
    showSelectedFundDetailsMsg(agent);
    agent.context.set({ name: 'fund_details_shown', lifespan: 2, parameters: { 'fund': fundName } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showFundsListFallback(agent) {
    const category = agent.context.get('funds_list_displayed')?.parameters?.category
    console.log('Inside Show_Funds_List_Fallback callback', category);
    handleFundsListResponse(agent, category, true);
    agent.context.set({ name: 'funds_list_displayed', lifespan:1, parameters: { 'category': category } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function showFundsList(agent) {
    const category = agent.parameters.category;
    console.log('Inside Show_Funds_List callback', category);
    handleFundsListResponse(agent, category);
    agent.context.set({ name: 'funds_list_displayed', lifespan: 1, parameters: { 'category': category } });
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
function fundsExplorerServiceSelectedFallback(agent) {
    setFundCategorySelectMsg(agent, retryMsg);
    agent.context.set({name: 'funds_category_displayed', lifespan: 1});
    utils.carryForwardSameContext(agent, "phone-number-provided");
}
//Also redirected using TRANSACTIONS_FOLLOWUP_EXPORE_FUNDS, NO_PORTFOLIO_EXPORE_FUNDS , GO_BACK_TO_MAIN_MENU
// and INVEST_IN_MORE_FUNDS
// both pass phone number in value param
function fundsExplorerServiceSelected(agent) {
    const value = agent.parameters?.value;
    console.log("Inside Fund_Explorer_Selected callback ", value);
    setFundCategorySelectMsg(agent);
    agent.context.delete('services_displayed');
    agent.context.set({name:'funds_category_displayed', lifespan: 1});
    if (value) {
        agent.context.set({ name: "phone-number-provided", lifespan:1, parameters: { 'value': value } });
    }
}
module.exports = {
    setupFundsIntents
};
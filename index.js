const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const files = require('./services/files');
const utils = require('./utils');
const portfolio = require('./services/portfolio');
const transactions = require('./services/transactions');
const retryMsg = 'I didn\'t understand. Can you try again?';


const app = express();
const funds = require('./services/funds');

const serviceSelectionMSG = `Hi, welcome to ABC Mutual Fund Services. What service would you like to use?
                Quick Suggestions:\n
                - Portfolio Valuation\n
                - Explore Funds\n
                - Transaction History\n`;
const getMobileNumberPrompt = `Kindly enter registered mobile number.`;
const getMobileNumberHtml = `Kindly enter <b>registered mobile number</b>.`;
const contactNumberValidationMsg = `Invalid number!!\n`;
const contactNumberValidationMsgHtml = `<b>Invalid number!!</b>\n`;
const portfolioBlankMsg = `You haven't purchased any funds yet\n Would you like to start exploring funds?\n`;


app.use(express.json());

app.post('/webhook', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  let intentMap = new Map();
  intentMap.set('Service Selection', serviceSelection);
  intentMap.set('Service Selection - fallback', serviceSelectionFallback);
  intentMap.set('Portfolio_OR_Transaction_Selected', askContactInfo);
  intentMap.set('Portfolio_OR_Transaction_Selected - fallback', askContactInfoFallback);
  intentMap.set('Enter_Contact_Details', validateContactInfoAndPrompt);
  intentMap.set('Explore_Funds_Confirmation', handleNoPortfolioUserResponse);
  intentMap.set('Default Fallback Intent', handleGracefulFallback);
  intentMap.set('Exit Conversation', handleGraceFulExit);
  intentMap.set('Fallback_Navigation', fallbackNavigation);
  funds.setupFundsIntents(intentMap);
  portfolio.setupFolioIntents(intentMap);
  transactions.setupTransactionManagerIntents(intentMap);
  agent.handleRequest(intentMap);
});
function fallbackNavigation(agent){
  console.log("Inside Fallback_Navigation Intent callback");
  const confirmation = agent.parameters?.confirmation;
  if(confirmation === 'yes'){
    agent.add('');
    agent.setFollowupEvent({
      name: 'MANUAL_WELCOME',
      languageCode: 'en'
    });
  }
  else if(confirmation === 'no') {
    agent.add('Thanks for using our services.');
    agent.end('Goodbye!!');
  } else{
    agent.add('');
    agent.setFollowupEvent({
      name: 'MANUAL_FALLBACK'
    });
  }
}
function handleGracefulFallback(agent){
  console.log("Inside Default Fallback Intent callback");
  handleGracefulFallbackMsg(agent);
}
function handleGracefulFallbackMsg(agent) {
  //agent.add(retryMsg);
  handleGracefulFallbackTelegramMsg(agent);
}
function handleGracefulFallbackTelegramMsg(agent){
  utils.createTelegramSuggestionFromList(agent, `I am not able to understand the conversation.\nWould you like to start from the service selection?`,['Yes', 'No']);
    agent.context.set({name: 'fallback_reached', lifespan: 1});
}
function handleGraceFulExit(agent){
  console.log("Inside Exit Conversation callback!");
  utils.clearAllContexts(agent);
  agent.add('Thanks for using our services.Goodbye!!');
}
function serviceSelection(agent) {
  serviceSelectionMsg(agent);
  // serviceSelectionMsgHtmlTest(agent);
  agent.context.set({name: 'services_displayed', lifespan: 1});
}

function serviceSelectionMsg(agent, error) {
  //serviceSelectionDialogFlowMsg(agent, error)
  serviceSelectionTelegramMsg(agent, error);
}
function serviceSelectionDialogFlowMsg(agent, error) {
  agent.add(error? retryMsg + serviceSelectionMSG: serviceSelectionMSG);
}
function serviceSelectionTelegramMsg(agent, error) {
  const errorMsg = error ? retryMsg : '';
  utils.createTelegramSuggestionFromList(agent, 'Hi, welcome to ABC Mutual Fund Services. What service would you like to use?',
    ['Portfolio Valuation', 'Explore Funds', 'Transaction History'], errorMsg
  )
}
function serviceSelectionFallback(agent) {
  serviceSelectionMsg(agent, true);
}

function serviceSelectionMsgHtmlTest(agent) {
  utils.renderAsTelegramPayload(agent, `<b>Your Recent Transactions</b>\n<pre>Date       | Portfolio      | Amount \n-------------------------------------\n2025-05-10 | AGF584986/59   | 912388  \n2025-05-10 | AGF584986/59   | 500     </pre>\n<b>Do you want to invest more?</b>`
  ,['Yes','No']);
}

function handleNoPortfolioUserResponse(agent) {
  const confirmation = agent.parameters.confirmation;
  const phone = agent.context.get('phone-number-provided')?.parameters?.value;
  if (confirmation === 'yes') {
    console.log("Inside handleNoPortfolioUserResponse");
    // utils.carryForwardSameContext(agent, 'phone-number-provided');
    // agent.context.delete('no_funds_start_exploring');
    agent.context.set({name: 'services_displayed', lifespan: 1});
    agent.add('I wanna invest in some funds. Show me the list.');
    agent.setFollowupEvent({
      name: 'NO_PORTFOLIO_EXPORE_FUNDS',
      parameters: { 'value': phone }
    });
  } else if (confirmation === 'no') {
    agent.add(`Thank you for using our services`);
    agent.clearOutgoingContexts();
    agent.end('Goodbye!');
  } else {
    agent.add(`Invalid response!!. Please reply with Yes or No.`);
    utils.carryForwardSameContext(agent, 'no_funds_start_exploring');
    utils.carryForwardSameContext(agent, 'phone-number-provided');
  }

}

function validateContactInfoAndPrompt(agent) {
  const phone = agent.parameters.phone;
  const service = agent.context.get('contact_info_asked')?.parameters?.service;
  const fundName = agent.context.get('contact_info_asked')?.parameters?.fundName;
  console.log('Inside Enter_Contact_Details intent callback', phone, service, fundName);
  if (typeof phone === 'number' && phone.toString().length == 10) {
    if (service === 'Portfolio Valuation') {
      const folios = files.getFolioList(phone.toString());
      console.log('Folio List', folios)
      if (folios.length === 0) {
        agent.add(portfolioBlankMsg);
        agent.context.set({ name: "no_funds_start_exploring", lifespan: 1 });
        agent.context.set({ name: "phone-number-provided", lifespan:2 , parameters: { 'value': phone } })
      } else {
        portfolio.getFolioResponse(agent, phone, folios);
      }
    } else if (service == 'Transaction History') {
      transactions.promptForTimePeriod(agent, phone);
      return;
    } else if (fundName) {
      agent.context.set({ 'name': 'fund_details_shown', lifespan: 1});
      agent.add('Invest');
      agent.setFollowupEvent({
        name: 'FUND_PHONE_RECEIVED',
        parameters: { 'fundName': fundName, 'phone': phone }
      });
    } else {
      agent.add("Internal Error!! Service Not found. Just for debugging");
    }
  } else {
    askContactInfoMsg(agent, true);
    agent.context.set({ name: "contact_info_asked", lifespan: 2, 
      parameters: { 'service': service, 'fundName': fundName } });
  }
}
// Will be redirected using this event FUND_EXPLORER_MISSING_PHONE_NO
function askContactInfo(agent) {  
  const service = agent.parameters.service;
  const fundName = agent.parameters.fundName;
  console.log('Inside Portfolio_OR_Transaction_Selected callback', service, fundName);
  askContactInfoMsg(agent);
  agent.context.set({
    name: "contact_info_asked", 
    lifespan: 2,
    parameters: { 'service': service, 'fundName': fundName }
  });
}

function askContactInfoFallback(agent){
  console.log('Inside Portfolio_OR_Transaction_Selected Fallback callback');
  askContactInfoMsg(agent, true);
  utils.carryForwardSameContext(agent, 'contact_info_asked');
}

function askContactInfoMsg(agent, error){
  //askContactInfoDialogFlowMsg(agent);
  askContactInfoTelegramMsg(agent, error);
}

function askContactInfoDialogFlowMsg(agent, error){
  agent.add(error? contactNumberValidationMsg + getMobileNumberPrompt: getMobileNumberPrompt);
}

function askContactInfoTelegramMsg(agent, error){
  const msg =error?contactNumberValidationMsgHtml + getMobileNumberHtml: getMobileNumberHtml;
  utils.renderAsTelegramPayload(agent,msg);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const files = require('./services/files');
const utils = require('./utils');
const portfolio = require('./services/portfolio');
const transactions = require('./services/transactions');


const app = express();
const funds = require('./services/funds');

const serviceSelectionMsg = `Hi, welcome to ABC Mutual Fund Services. What service would you like to use?
                Quick Suggestions:\n
                - Portfolio Valuation\n
                - Explore Funds\n
                - Transaction History\n`;
const getMobileNumberPrompt = `Kindly enter registered contact number.`;
const contactNumberValidationMsg = `Invalid number!!\n`;
const portfolioBlankMsg = `You haven't purchased any funds yet\n Would you like to start exploring funds?\n`;


app.use(express.json());

app.post('/webhook', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  function serviceSelection(agent) {
    // agent.add(serviceSelectionMsg);
    // serviceSelectionMsgTelegram(agent);
    serviceSelectionMsgHtmlTest(agent);
    agent.context.set({name: 'services_displayed', lifespan: 1});
  }

  function serviceSelectionFallback(agent) {
    agent.add('I didn\'t understand. Can you try again?\n' + serviceSelectionMsg);
  }

  function serviceSelectionMsgTelegram(agent){
      agent.add(`Hi, welcome to ABC Mutual Fund Services. What service would you like to use?`);
      agent.add(`Portfolio Valuation`);
      agent.add(`Explore Funds`);
      agent.add(`Transaction History`);
  }
  function serviceSelectionMsgHtmlTest(agent) {
    utils.renderAsTelegramHTMLPayload(agent, `<b>Your Recent Transactions</b>\n<pre>Date       | Portfolio      | Amount \n-------------------------------------\n2025-05-10 | AGF584986/59   | 912388  \n2025-05-10 | AGF584986/59   | 500     </pre>\n<b>Do you want to invest more?</b>`
    ,['Yes','No']);
  }

  function fallback(agent) {
    agent.add('I didn\'t understand. Can you try again?');
  }

  let intentMap = new Map();
  intentMap.set('Service Selection', serviceSelection);
  intentMap.set('Service Selection - fallback', serviceSelectionFallback);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Portfolio_OR_Transaction_Selected', askContactInfo);
  intentMap.set('Enter_Contact_Details', validateContactInfoAndPrompt);
  intentMap.set('Explore_Funds_Confirmation', handleNoPortfolioUserResponse);
  funds.setupFundsIntents(intentMap);
  portfolio.setupFolioIntents(intentMap);
  transactions.setupTransactionManagerIntents(intentMap);
  agent.handleRequest(intentMap);
});


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
    agent.add(contactNumberValidationMsg + getMobileNumberPrompt);
    agent.context.set({ name: "contact_info_asked", lifespan: 2, 
      parameters: { 'service': service, 'fundName': fundName } });
  }
}
// Will be redirected using this event FUND_EXPLORER_MISSING_PHONE_NO
function askContactInfo(agent) {  
  const service = agent.parameters.service;
  const fundName = agent.parameters.fundName;
  console.log('Inside Portfolio_OR_Transaction_Selected callback', service, fundName)
  agent.add(getMobileNumberPrompt);
  agent.context.set({
    name: "contact_info_asked", 
    lifespan: 2,
    parameters: { 'service': service, 'fundName': fundName }
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
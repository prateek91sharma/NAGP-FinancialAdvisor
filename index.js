const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const files = require('./services/files');
const utils = require('./utils');
const portfolio = require('./services/portfolio');
const transactions = require('./services/transactions');


const app = express();
const funds = require('./services/funds');

const serviceSelectionMsg=`Hi, welcome to ABC Mutual Fund Services. What service would you like to use?
                Quick Suggestions:\n
                - Portfolio Valuation\n
                - Explore Funds\n
                - Transaction History\n`;
const getMobileNumberPrompt = `Kindly enter registered contact number.`;
const contactNumberValidationMsg =`Invalid number!!\n`;
const portfolioBlankMsg = `You haven't purchased any funds yet\n Would you like to start exploring funds?\n`;


app.use(express.json());

app.post('/webhook', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function serviceSelection(agent) {
    agent.add(serviceSelectionMsg);
    agent.setContext('services_displayed');
  }

  function serviceSelectionFallback(agent) {
    agent.add('I didn\'t understand. Can you try again?\n'+serviceSelectionMsg);
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

function handleNoPortfolioUserResponse(agent){
  const confirmation = agent.parameters.confirmation;
  if(confirmation === 'yes'){
    // utils.carryForwardSameContext(agent, 'phone-number-provided');
    agent.clearContext('no_funds_start_exploring');
    agent.setFollowupEvent({name: 'NO_PORTFOLIO_EXPORE_FUNDS',
      parameters: agent.context.get('phone-number-provided')?.parameters});
  } else if (confirmation === 'no'){
    agent.add(`Thank you for using our services`);
    agent.clearOutgoingContexts();
    agent.end('Goodbye!');
  } else {
    agent.add(`Invalid response!!. Please reply with Yes or No.`);
    utils.carryForwardSameContext(agent, 'no_funds_start_exploring');
    utils.carryForwardSameContext(agent, 'phone-number-provided');
  }

}

function validateContactInfoAndPrompt(agent){
  const phone = agent.parameters.phone;
  if (typeof phone === 'number' && phone.toString().length==10) {
    const service = agent.context.get('contact_info_asked')?.parameters?.service;
    const fundName = agent.context.get('contact_info_asked')?.parameters?.fundName;
    if(service === 'Portfolio Valuation'){
      const folios =files.getFolioList(phone);
      if(folios.length === 0){
        agent.add(portfolioBlankMsg);
        agent.setContext({name: "no_funds_start_exploring", lifespan: 1});
        agent.setContext({name: "phone-number-provided", parameters:{'value': phone}})
      } else{
        portfolio.getFolioResponse(agent, phone, folios);
      }
    } else if (service === 'Transaction History'){
      transactions.promptForTimePeriod(agent, phone);
    } else if(fundName){
      agent.setFollowupEvent({name: 'FUND_PHONE_RECEIVED',
        parameters: {'fundName': fundName, 'phone': phone}});
    } else{
      agent.add("Internal Error!! Service Not found. Just for debugging");
    }

  } else{  
    const service = agent.context.get('contact_info_asked')?.parameters?.service
    agent.add(contactNumberValidationMsg + getMobileNumberPrompt);
    agent.setContext({name: "contact_info_asked", parameters:{'service': service}});
  }
}
// Will be redirected using this event FUND_EXPLORER_MISSING_PHONE_NO
function askContactInfo(agent) {
  const service = agent.parameters.service;
  const fundName = agent.parameters.fundName;
  agent.add(getMobileNumberPrompt);
  agent.setContext({name: "contact_info_asked", parameters:{'service': service, 'fundName': fundName}});
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
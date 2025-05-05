const files = require('./files');
const moment = require('moment');
const utils = require('../utils');


const invalidTransactionDuration = `Invalid Duration provided.\n`
const invalidTransactionDurationFutureDate = `Future Date Provided.\n`

const provideTransactionsDuration = `Kindly provide a time period.`;
const durationSuggestions =['Current Financial Year', 'Previous Financial Year'];
const noPastTransactionFoundMsg = `No past transactions found.\n`;
const promptForMoreInvestment = `Do you want to invest more?`;
function setupTransactionManagerIntents(intentMap) {
    intentMap.set('Transaction_Period_Entered', validateDurationAndRespond);
    intentMap.set('Transaction_Display_Invest_More', handleMoreInvestmentUserInput);
}

function handleMoreInvestmentUserInput(agent){
    const phone = agent.context.get('transactions_flow_invest_more')?.parameters?.phone;
    const confirmation = agent.parameters.confirmation;
    if(confirmation === 'yes'){
        agent.clearContext('transactions_flow_invest_more');
        agent.setFollowupEvent({name: 'TRANSACTIONS_FOLLOWUP_EXPORE_FUNDS',
          parameters: {'value': phone}});
      } else if (confirmation === 'no'){
        agent.add(`Thank you for using our services`);
        agent.clearOutgoingContexts();
        agent.end('Goodbye!');
      } else {
        agent.add(`Invalid response!!. Please reply with Yes or No.`);
        utils.carryForwardSameContext(agent, 'transactions_flow_invest_more');
      }
}

function validateDurationAndRespond(agent) {
    const phone = agent.context.get('transactions_flow_started')?.parameters?.phone;
    const suggestion = agent.parameters?.suggestion;
    const start = agent.parameters?.datePeriod?.startDate;
    const end = agent.parameters?.datePeriod?.endDate;
    let transactions;
    if (suggestion) {
        if (suggestion != 'current' && suggestion != 'previous') {
            promptForTimePeriod(agent, phone, invalidTransactionDuration);
            return;
        } else {
            transactions = files.getTransactionByDateRange(phone, suggestion);
        }
    } else {
        if (start && end) {
            const startDate = moment(start);
            const endDate = moment(end);
            if(startDate.isAfter(moment()) || endDate.isAfter(moment())){
                promptForTimePeriod(agent, phone, invalidTransactionDurationFutureDate);
                return;
            }
            transactions = files.getTransactionByDateRange(phone, '', startDate, endDate);
        } else {
            promptForTimePeriod(agent, phone, invalidTransactionDuration);
            return;
        }
    }
    if(transactions.length === 0){
        agent.add(noPastTransactionFoundMsg + promptForMoreInvestment);
    } else {
        agent.add(new Table({
            title: 'Transactions list',
            columns: [
                { header: 'Date' },
                { header: 'Portfolio' },
                { header: 'Amount' }
            ],
            rows: transactions.splice(0, 3).map(fund => ({
                cells: [fund.date, fund.portfolio_no, fund.amount],
            }))
        }));
        agent.add(promptForMoreInvestment);
    }
    utils.carryForwardDifferentContext('transactions_flow_started', 'transactions_flow_invest_more');
}


function promptForTimePeriod(agent, phone, errorMsg) {
    const msg = errorMsg ? errorMsg + provideTransactionsDuration : provideTransactionsDuration;
    agent.add(msg);
    durationSuggestions.forEach(item => {
        agent.add(new Suggestion(item));
    });
    agent.setContext({ name: "transactions_flow_started", lifespan: 1, parameters: { 'phone': phone } });
}

module.exports ={
    setupTransactionManagerIntents,
    promptForTimePeriod
}
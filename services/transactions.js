const files = require('./files');
const moment = require('moment');

const invalidTransactionDuration = `Invalid Duration provided.\n`
const invalidTransactionDurationFutureDate = `Future Date Provided.\n`

const provideTransactionsDuration = `Kindly provide a time period.`;
const durationSuggestions =['Current Financial Year', 'Previous Financial Year'];
function setupTransactionManagerIntents(intentMap) {
    intentMap.set('Transaction_Period_Entered', validateDurationAndRespond);
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
        // promopt for no transation and start investing
    } else{
        //rich table response to show 3 transations
    }
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
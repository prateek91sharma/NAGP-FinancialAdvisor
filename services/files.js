const fs = require('fs');
const path = require('path');
const moment = require('moment');
const filePath = path.resolve(__dirname, '../static_data/transactionhistory.json');
const currentFYStart = moment('2025-04-01');
const lastFYStart = moment('2024-04-01');

function getTransactionByDateRange(mobileNo, type, startDate, endDate) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    var start;
    var end;
    if (type === 'current') {
        start = currentFYStart;
        end = moment().add(1, 'day');
    } else if (type === 'previous') {
        start = lastFYStart;
        end = currentFYStart.subtract(1, 'day');
    } else {
        start = startDate;
        end = endDate;
    }
    console.log('Dates used for filtering transactions internally', start, end);
    return data.filter(user => user.mobile === mobileNo)
        .flatMap(o => o.transactions)
        .filter(o => {
            var date = moment(o.date);
            return date.isSameOrAfter(start) && date.isSameOrBefore(end);
        }).sort((o1, o2) => moment(o2.date).diff(moment(o1.date)));
}

function getFolioDetails(folioNumber, mobileNo) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const amount = data.filter(user => user.mobile === mobileNo)
        .flatMap(o => o.transactions)
        .filter(transaction => transaction.portfolio_no === folioNumber)
        .reduce((acc, t) => t.amount + acc, 0);
    const currentDate = moment().format("YYYY-MM-DD");
    return { amount, currentDate };
}

function getTransactionsByPortfolio(mobileNo, folioNumber) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.filter(user => user.mobile === mobileNo)
        .flatMap(o => o.transactions)
        .filter(tx => tx.portfolio_no === folioNumber);
}


function getFolioList(mobileNo) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.from(new Set(data.filter(user => user.mobile === mobileNo)
        .flatMap(o => o.transactions)
        .map(o => o.portfolio_no)));
}

function addTransaction(transaction, mobileNo) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let jsonData = JSON.parse(fileContent);

    const index = jsonData.findIndex(obj => obj.mobile === mobileNo.toString());
    const date = moment().format("YYYY-MM-DD");
    let transactionToInsert = { ...transaction, date };
    if (index !== -1) {
        const portfolio_no = getFolioNumber(jsonData[index].transactions, transaction.fund_name);
        transactionToInsert = { ...transactionToInsert, portfolio_no };
        jsonData[index].transactions = [...jsonData[index].transactions, transactionToInsert];
        writeToFile(jsonData);
        console.log(`Added new transation to user with mobile ${mobileNo}`);
    } else {
        const portfolio_no = generateFolioString(transaction.fund_name);
        transactionToInsert = { ...transactionToInsert, portfolio_no };
        jsonData.push({ "mobile": `${mobileNo}`, "transactions": [transactionToInsert] });
        writeToFile(jsonData);
        console.log(`User with mobile ${mobileNo} not found, added user and first transation`);
    }
}

function getFolioNumber(transactions, fund_name) {
    const index = transactions.findIndex(obj => obj.fund_name === fund_name);
    if (index !== -1) {
        return transactions[index].portfolio_no;
    }
    else {
        return generateFolioString(fund_name);
    }
}
function generateFolioString(input) {
    const initials = input
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    const prefix = Math.floor(100000 + Math.random() * 900000);
    const suffix = Math.floor(10 + Math.random() * 90);

    return `${initials}${prefix}/${suffix}`;
}

function writeToFile(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Data written to file.');
}

module.exports = {
    addTransaction,
    getFolioList,
    getFolioDetails,
    getTransactionByDateRange,
    getTransactionsByPortfolio
}
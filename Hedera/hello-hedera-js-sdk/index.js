const { 
    Client, 
    PrivateKey, 
    AccountCreateTransaction, 
    AccountBalanceQuery, 
    Hbar, 
    TransferTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenAssociateTransaction
} = require("@hashgraph/sdk");

require('dotenv').config();

async function environmentSetup() {

    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    //Create your local client
    // const node = {"127.0.0.1:50211": new AccountId(3)};
    // conconst node = {"127.0.0.1:50211": new AccountId(3)};
    // const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");
    
    //Create your Hedera Testnet client
    const client = Client.forTestnet();

    //Set your account as the client's operator
    client.setOperator(myAccountId, myPrivateKey);

    //Set the default maximum transaction fee (in Hbar)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    //Set the maximum payment for queries (in Hbar)
    client.setDefaultMaxQueryPayment(new Hbar(50));

    // If we weren't able to grab it, we should throw a new error
    if (!myAccountId || !myPrivateKey) {
        throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    //Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519(); 
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    //Create a new account with 1,000 tinybar starting balance
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);

    // Get the new account ID
    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;

    //Log the account ID
    console.log("The new account ID is: " +newAccountId);

    //Verify the account balance
    // const accountBalance = await new AccountBalanceQuery()
    //     .setAccountId(newAccountId)
    //     .execute(client);

    // console.log("The new account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");

    // //Create the transfer transaction
    // const sendHbar = await new TransferTransaction()
    //     .addHbarTransfer(myAccountId, Hbar.fromTinybars(-1000)) //Sending account
    //     .addHbarTransfer(newAccountId, Hbar.fromTinybars(1000)) //Receiving account
    //     .execute(client);
        
    // //Verify the transaction reached consensus
    // const transactionReceipt = await sendHbar.getReceipt(client);
    // console.log("The transfer transaction from my account to the new account was: " + transactionReceipt.status.toString());

    const supplyKey = PrivateKey.generate();

    // CREATE FUNGIBLE TOKEN (STABLECOIN)
    let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("USD Bar")
    .setTokenSymbol("USDB")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

    //SIGN WITH TREASURY KEY
    let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromStringECDSA(myPrivateKey));

    //SUBMIT THE TRANSACTION
    let tokenCreateSubmit = await tokenCreateSign.execute(client);

    //GET THE TRANSACTION RECEIPT
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    //GET THE TOKEN ID
    let tokenId = tokenCreateRx.tokenId;

    //LOG THE TOKEN ID TO THE CONSOLE
    console.log(`- Created token with ID: ${tokenId} \n`);

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- My Account balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New Account balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

    const transaction = await (await (await (await new TokenAssociateTransaction().setAccountId(newAccountId).setTokenIds([tokenId]).freezeWith(client)).sign(newAccountPrivateKey)).execute(client)).getReceipt(client);

    const transactionStatus = transaction.status

    console.log("Transaction of assoc.: "+ transactionStatus)

    const transferTransaction = await ( await ( await ( await new TransferTransaction().addTokenTransfer(tokenId, myAccountId, -10).addTokenTransfer(tokenId, newAccountId, 10).freezeWith(client)).sign(PrivateKey.fromStringECDSA(myPrivateKey))).execute(client)).getReceipt(client)

    const transferStatus = transferTransaction.status

    console.log("Transfer Status: "+ transferStatus)

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- My Account balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- New Account balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

    

}
environmentSetup();
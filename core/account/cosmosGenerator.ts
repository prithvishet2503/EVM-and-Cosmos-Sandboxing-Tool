import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

export async function generateCosmosAccount(addressPrefix: string = 'cosmos') {
  // Generate a random mnemonic (24 words)
  const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: addressPrefix });
  const accounts = await wallet.getAccounts();
  const mnemonic = wallet.mnemonic;

  return {
    address: accounts[0].address,
    mnemonic,
  };
}

export async function generateCosmosAccounts(addressPrefix: string = 'cosmos') {
  const sender = await generateCosmosAccount(addressPrefix);
  const receiver = await generateCosmosAccount(addressPrefix);
  const secondAccount = await generateCosmosAccount(addressPrefix);

  return {
    sender,
    receiver,
    secondAccount,
  };
}

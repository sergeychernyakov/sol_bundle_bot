export function distributeAmount(totalAmount: number, numberOfWallets: number): number[] {
    console.log(`Distributing total amount ${totalAmount} among ${numberOfWallets} wallets.`);
    let randomNumbers: number[] = [];
    for (let i = 0; i < numberOfWallets; i++) {
        randomNumbers.push(Math.random());
    }
    console.log('Random numbers generated:', randomNumbers);

    const sum: number = randomNumbers.reduce((a, b) => a + b, 0);
    randomNumbers = randomNumbers.map((num) => num / sum);

    let amounts: number[] = randomNumbers.map((num) => num * totalAmount);

    amounts = amounts.map((num) => parseFloat(num.toFixed(6)));

    const adjustedAmounts: number[] = adjustAmounts(amounts, totalAmount);
    console.log('Adjusted amounts:', adjustedAmounts);

    return adjustedAmounts;
}

function adjustAmounts(amounts: number[], totalAmount: number): number[] {
    console.log('Adjusting amounts to match total amount.');
    const sum: number = amounts.reduce((a, b) => a + b, 0);
    const diff: number = totalAmount - sum;

    console.log(`Sum of amounts: ${sum}, Difference: ${diff}`);

    amounts[0] += diff;

    return amounts;
}
export const netMap = {
    1: {
        name: "ETH",
        url: "https://etherscan.io/",
        icon: "src/assets/chains/eth.png"
    },
    5: {
        name: "ETH TESTNET",
        url: "https://etherscan.io/",
        icon: "src/assets/chains/eth.png"
    },
    56: {
        name: "BSC",
        url: "https://bscscan.com/",
        icon: "src/assets/chains/bsc.png"
    },
    137: {
        name: "Polygon",
        url: "https://polygonscan.com/",
        icon: "src/assets/chains/polygon.png"
    },
    42161: {
        name: "Arbitrum",
        url: "https://arbiscan.io/",
        icon: "src/assets/chains/arbitrum.png"
    },
    10: {
        name: "ETH",
        url: "https://optimistic.etherscan.io/",
        icon: "src/assets/chains/optimistic.png"
    }
}

export const checkAddr = (network, addr) => {
    window.open(netMap[network].url + "address/" + addr)
}

export const useDefaultImage = (event) => {
    event.target.src = "src/assets/coin.svg";
}

export const handleAddr = (addr) => {
    if (!addr || addr.length !== 42) {
        return
    }
    return addr.substring(0, 5) + "..." + addr.substring(38.42)
}

export const handleBigNumber = (amountStr) => {
    const amount = parseFloat(amountStr);
    let symbol = '';
    switch (true) {
        case amount >= 1e15:
            return chrome.i18n.getMessage('all');
        case amount >= 1e12:
            symbol = "T"
            break;
        case amount >= 1e9:
            symbol = "B"
            break;
        default:
            return parseFloat(amountStr);
    }

    if (symbol === "T") {
        return `${(amount / 1e12).toFixed(2)}${symbol}`
    }
    if (symbol === "B") {
        return `${(amount / 1e9).toFixed(2)}${symbol}`
    }
}

export function formatMemeNumber(num, fixedNumber) {
    if (num === '0' || num === 0 || num === undefined) {
        return num;
    }
    // 将数字转换为字符串并分割为整数部分和小数部分
    let [integerPart, decimalPart] = num.split('.');

    // 计算小数部分前导零的个数
    let leadingZeros = 0;
    if (decimalPart) {
        for (let char of decimalPart) {
            if (char === '0') {
                leadingZeros++;
            } else {
                break;
            }
        }
    } else {
        return num;
    }

    // 取前导零后面的前 5 位数字
    const significantDigits = decimalPart.slice(
        leadingZeros,
        leadingZeros + fixedNumber,
    );

    // 如果前导零的个数小于 2 个，返回原始数字字符串
    if (leadingZeros < 2) {
        return parseFloat(num).toFixed(fixedNumber).toString();
    }

    // 生成格式化的字符串
    if (leadingZeros > 0) {
        return `${integerPart}.0{${leadingZeros}}${significantDigits}`;
    } else {
        // 如果没有前导零，直接返回原始数字字符串（截取前5位）
        return `${integerPart}.${decimalPart.slice(0, fixedNumber)}`;
    }
}

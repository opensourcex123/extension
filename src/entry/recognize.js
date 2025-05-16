
async function RecognizeTransaction(chainId, argArray, provider) {
    // console.log("参数", argArray)
    // console.log("params", JSON.parse(argArray.params[1]))
    chainId = parseInt(chainId, 16)
    let language = "en"
    if (window.navigator.language === "zh-CN") {
        language = "zh"
    }
    const method = argArray.method
    let responseObj
    const signMethodList = ["personal_sign", "eth_sign", "eth_signTypedData_v4", "eth_signTypedData_v3", "eth_signTypedData_v1"]
    const signVersionList = ["eth_signTypedData_v4", "eth_signTypedData_v3", "eth_signTypedData_v1"]
    const seaportVersionWithTree = ['1.4', '1.5'];

    if (signMethodList.includes(method)) {

        let type = 0

        if (signVersionList.includes(method)) {
            const sign = JSON.parse(argArray.params[1])
            if (sign.domain.name === "Seaport" && seaportVersionWithTree.includes(sign.domain.version)) {
                if (Array.isArray(sign.message.tree[0])) {
                    type = 1
                }
            }
        }

        responseObj = {
            body: {
                type: type,
                method: method,
                params: argArray.params,
                chain_id: chainId,
                language: language,
            },
            type: "sign",
            end_url: "recognizeSign"
        }
    }

    if (method === "eth_sendTransaction") {
        const from = argArray.params[0].from
        const contractAddress = argArray.params[0].to
        const value = argArray.params[0].value || "0x0"
        const data = argArray.params[0].data || ""

        responseObj = {
            body: {
                from: from,
                to: contractAddress,
                value: value,
                data: data,
                chain_id: chainId,
                language: language,
            },
            type: "tx",
            end_url: "recognizeTx"
        }
    }

    if (method === 'wallet_sendCalls') {
        console.log('argArray', argArray)
        const from = argArray.params[0].from

        const batchTx = argArray.params[0].calls.map(item => {
            return {
                from,
                to: item.to,
                value: item.value,
                data: item?.data || '',
                chain_id: chainId,
                language: language,
                website: window.location.host,
                source: 'EXTENSION',
                user_address: ""
            }
        })
        console.log('body', batchTx)

        responseObj = {
            body: {batch_transaction: batchTx},
            type: "tx",
            end_url: "recognizeBatchTx"
        }

    }

    let res;
    if (provider.request) {
        res = await provider.request({
            method: 'eth_requestAccounts',
        })
    } else if (!provider.request) {
        res = await provider({
            method: 'eth_requestAccounts'
        })
    }

    responseObj.body.user_address = res[0]

    return responseObj
}

export {RecognizeTransaction}

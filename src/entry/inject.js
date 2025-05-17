import {RecognizeTransaction} from "@/entry/recognize";
import {ethErrors} from 'eth-rpc-errors';
import {isEmpty} from "lodash-es";
import { nanoid } from 'nanoid'

// let proxyInterval;
const method = ['eth_sendTransaction', 'eth_signTypedData_v4', 'eth_sign', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v1', 'eth_signTypedData_v3', 'wallet_sendCalls']
const supportNetwork = ['0x1', '0x38', '0x89', '0xa4b1', '0xa', '0x5', '0xaa36a7']

function continueRequest(metamaskRequest, ethereumRequestArguments, resolve, reject) {
    return metamaskRequest({ ...ethereumRequestArguments })
        .then((data) => {
            console.log('eth', ethereumRequestArguments)
            if (ethereumRequestArguments.method === 'wallet_switchEthereumChain') {
                console.log('data', data)
            }
            console.log('data', data)
            resolve(data);
        })
        .catch((error) => reject(error));
}

// network change
if (window.ethereum && window.ethereum.request) {
    // console.log('能监听到吗')
    window.ethereum.request({method: 'eth_chainId'}).then(res => {
        // console.log('network', res)
        sessionStorage.setItem('network', res)
    })
    window.ethereum.on('chainChanged', (res) => {
        // console.log('可以', res)
        sessionStorage.setItem('network', res)
    })
}

// eslint-disable-next-line no-unused-vars
async function postEvent(metamaskRequest, ethereumRequestArguments, resolve, reject) {
    try {
        let uuid = nanoid()
        const chainId = sessionStorage.getItem('network')
        // let params

        RecognizeTransaction(chainId, ethereumRequestArguments, metamaskRequest).then(res => {
            if (!res) {
                return
            }
            // params = res
            let event = new CustomEvent('ByteHunter-Message', {
                detail: {
                    uuid: uuid,
                    params: res,
                    type: 1
                }
            })
            window.dispatchEvent(event)
        })

        let event = new CustomEvent('ByteHunter-Message', {detail: {uuid: uuid, type: 0}})
        window.dispatchEvent(event)
        // console.log('request发出')
        window.addEventListener(uuid, (event) => {
            if (event.detail.confirm) {
                console.log('confrim:', ethereumRequestArguments.params)
                return metamaskRequest({
                    method: ethereumRequestArguments.method,
                    params: ethereumRequestArguments.params,
                })
                    .then((data) => resolve(data))
                    .catch((error) => {
                        console.log('err1', error)
                        reject(error)
                    });
            } else if (event.detail.cancel) {
                reject({
                    code: 4001,
                    message:
                        "MetaMask Tx Signature: User denied transaction signature.",
                });
            }
        }, {once: true})
    } catch (e) {
        console.log(e)
        continueRequest(metamaskRequest, ethereumRequestArguments, resolve, reject, 0)
    }

}

const proxyEthereumProvider = (ethereumProvider) => {
    // Only add our proxy once per provider
    // console.log('provider', ethereumProvider)
    if (!ethereumProvider || ethereumProvider.isByteHunter) return;

    ethereumProvider.send = new Proxy(ethereumProvider.send, {
        apply(target, thisArg, argArray) {
            if (!supportNetwork.includes(sessionStorage.getItem('network'))) {
                return Reflect.apply(target, thisArg, argArray);
            }
            // console.log('代理send成功')

            const [payloadOrMethod, callbackOrParams] = argArray;

            // ethereum.send has three overloads:

            // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
            // > gets handled like ethereum.request
            if (typeof payloadOrMethod === 'string') {
                console.log('send func trigger', argArray, thisArg)
                return ethereumProvider.request({ method: payloadOrMethod, params: callbackOrParams });
            }

            // ethereum.send(payload: JsonRpcRequest): unknown;
            // > cannot contain signature requests
            if (!callbackOrParams) {
                return Reflect.apply(target, thisArg, argArray);
            }

            // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;
            // > gets handled like ethereum.sendAsync
            return ethereumProvider.sendAsync(payloadOrMethod, callbackOrParams);
        }
    })

    if (ethereumProvider.request) {
        const metamaskRequest = ethereumProvider.request;
        const customRequest = ({ ...ethereumRequestArguments }) => {
            return new Promise((resolve, reject) => {
                // console.log('sdfa', ethereumRequestArguments)
                if (!supportNetwork.includes(sessionStorage.getItem('network'))) {
                    continueRequest(metamaskRequest, ethereumRequestArguments, resolve, reject)
                    return;
                }

                if (method.includes(ethereumRequestArguments.method)) {
                    console.log('拦截到了',ethereumRequestArguments)
                    postEvent(metamaskRequest, ethereumRequestArguments, resolve, reject).then(() => {})
                }  else {
                    continueRequest(metamaskRequest, ethereumRequestArguments, resolve, reject)
                }
            });
        };

        ethereumProvider.request = customRequest;
    }

    // 拦不住okxwallet
    // ethereumProvider.request = new Proxy(ethereumProvider.request, {
    //     async apply(target, thisArg, argArray) {
    //         const [request] = argArray;
    //         console.log('request', request)
    //         if (!request) {
    //             return Reflect.apply(target, thisArg, argArray);
    //         }
    //
    //         if (!supportNetwork.includes(sessionStorage.getItem('network'))) {
    //             return Reflect.apply(target, thisArg, argArray);
    //         }
    //
    //         if (method.includes(request.method)) {
    //             console.log('request 代理成功')
    //             let uuid = nanoid()
    //             const chainId = sessionStorage.getItem('network')
    //             // let params
    //
    //             const res = await RecognizeTransaction(chainId, request, ethereumProvider)
    //             if (!res) {
    //                 return Reflect.apply(target, thisArg, argArray);
    //             }
    //             // params = res
    //             window.dispatchEvent(new CustomEvent('ByteHunter-Message', {
    //                     detail: {
    //                         uuid: uuid,
    //                         params: res,
    //                         type: 1
    //                     }
    //                 }))
    //             window.dispatchEvent(new CustomEvent('ByteHunter-Message', {detail: {uuid: uuid, type: 0}}))
    //             window.addEventListener(uuid, (event) => {
    //                 console.log('开始监听')
    //                 if (event.detail.confirm) {
    //                     request.params.fromExtension = true;
    //                 } else if (event.detail.cancel) {
    //                     return ethErrors.provider.userRejectedRequest(
    //                         'User denied message signature.'
    //                     );
    //                 }
    //             })
    //         }
    //         return Reflect.apply(target, thisArg, argArray)
    //     }
    // })

    ethereumProvider.sendAsync = new Proxy(ethereumProvider.sendAsync, {
        apply(target, thisArg, argArray) {
            const [request, callback] = argArray;
            if (!request) {
                return Reflect.apply(target, thisArg, argArray);
            }

            if (!supportNetwork.includes(sessionStorage.getItem('network'))) {
                return Reflect.apply(target, thisArg, argArray);
            }

            // console.log('sendAsync 代理成功')

            if (method.includes(request.method)) {
                console.log('sendAsync 拦截到了',argArray)
                let uuid = nanoid();
                const chainId = sessionStorage.getItem('network')

                RecognizeTransaction(chainId, request, ethereumProvider).then(res => {
                    if (!res) {
                        return Reflect.apply(target, thisArg, argArray)
                    }
                    let event = new CustomEvent('ByteHunter-Message', {
                        detail: {
                            uuid: uuid,
                            params: res,
                            type: 1
                        }
                    })
                    window.dispatchEvent(event)
                })

                let event = new CustomEvent('ByteHunter-Message', {detail: {uuid: uuid, type: 0}})
                window.dispatchEvent(event)
                window.addEventListener(uuid, (event) => {
                    if (event.detail.confirm) {
                        request.params.fromExtension = true;
                        // console.log(argArray)
                        return Reflect.apply(target, thisArg, argArray)
                    } else if (event.detail.cancel) {
                        const error = ethErrors.provider.userRejectedRequest(
                            'User denied message signature.'
                        );
                        const response = {
                            id: request?.id,
                            jsonrpc: '2.0',
                            error,
                        };
                        callback(error, response);
                    }
                }, {once: true})
            } else {
                return Reflect.apply(target, thisArg, argArray);
            }
        }
    })

    ethereumProvider.isByteHunter = true;
};

const proxyAllEthereumProviders = () => {
    // clearInterval(proxyInterval);

    if (!isEmpty(window.ethereum)) {
        // console.log('代理ethereum')
        proxyEthereumProvider(window.ethereum);
    }
}

// proxyInterval = setInterval(proxyAllEthereumProviders, 100);
proxyAllEthereumProviders();

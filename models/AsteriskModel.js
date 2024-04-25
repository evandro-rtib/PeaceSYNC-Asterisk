const { log } = require('console');
const fs = require('fs');
class AsteriskModel {

    constructor() {
        this.folder_asterisk = '/etc/asterisk';
        this.folder_call_centers = `${this.folder_asterisk}/call_centers`;
        this.folder_globals = `${this.folder_asterisk}/globals`;
        this.folder_scripts = `${this.folder_asterisk}/scripts`;
    }

    async prepareBasicFolders() {
        try {
            await this.createFolders(this.folder_asterisk);
        } catch (err) {
            console.error("Erro ao criar as pastas:", err);
        }
        try {
            await this.createFolders(this.folder_call_centers);
        } catch (err) {
            console.error("Erro ao criar as pastas:", err);
        }
        try {
            await this.createFolders(this.folder_globals);
        } catch (err) {
            console.error("Erro ao criar as pastas:", err);
        }
        try {
            await this.createFolders(this.folder_scripts);
        } catch (err) {
            console.error("Erro ao criar as pastas:", err);
        }
    }

    peersReadAll = () => {

    }

    async createFolders(folder) {
        return new Promise((resolve, reject) => {
            fs.access(folder, fs.constants.F_OK, (err) => {
                if (err) {
                    fs.mkdir(folder, { recursive: true }, (err) => {
                        if (err) {
                            console.error(`Erro ao criar o diretório ${folder}:`, err);
                            reject(err);
                        } else {
                            console.log(`Diretório ${folder} criado com sucesso.`);
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }
    async listCallCenter(objData) {
        const list = []
        objData.peers.forEach(obj => {
            if (obj.CALL_CENTER_ID) {
                const test = list.find(e => e === obj.CALL_CENTER_ID)
                if (!test) {
                    list.push(obj.CALL_CENTER_ID)
                }
            }
        })
        return list
    }

    async listCustomer(objData) {
        const list = []
        objData.peers.forEach(obj => {
            if (obj.CUSTOMER_ID && obj.CALL_CENTER_ID) {
                const test = list.find(e => e.CUSTOMER_ID === obj.CUSTOMER_ID && e.CALL_CENTER_ID === obj.CALL_CENTER_ID)
                if (!test) {
                    list.push(obj.CUSTOMER_ID)
                }
            }
        })
        return list
    }

    async writeFile(filename,rows){
        return new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filename);
            stream.on('error', err => {
                reject(err);
            });
     
            stream.on('finish', () => {
                resolve();
            });

            rows.forEach(row => {
                stream.write(row + '\n');
            });
    
            stream.end();
        });
    }

    async cleanLines(lines){
        let separateLines = lines.split('\n')
        let cleanLine = separateLines.map(line => line.trim())
        let newLines = cleanLine.join('\n')
        return newLines
    }

    async createContext (contextData){
        const dataContext = []
        const filename = `${this.folder_call_centers}/${contextData.CALL_CENTER_ID}/contexts/${contextData.ID}.conf`
            const contextConfiguration = `
                                        [${contextData.ID}] ; ${contextData.CONTEXT_NAME}
                                        ${contextData.EXTENSIONS_BLOCK}
                                    `
            dataContext.push(await this.cleanLines(contextConfiguration))

        await this.writeFile(filename,dataContext)
    }

    async createQueue (queueData){
        const dataQueue = []
        const filename = `${this.folder_call_centers}/${queueData.CALL_CENTER_ID}/queues/${queueData.ID}.conf`
            const queueConfiguration = `
                                        [${queueData.ID}] ; ${queueData.QUEUE_NAME}
                                        strategy=${queueData.STRATEGY}
                                    `
            dataContext.push(await this.cleanLines(contextConfiguration))

        await this.writeFile(filename,dataContext)
    }

    async createTemplate (templateData){
        const dataTemplate = []
        const filename = `${this.folder_call_centers}/${templateData.CALL_CENTER_ID}/templates/${templateData.ID}.conf`
        if( templateData.CONFIGURATION_BLOCK_2 &&
            templateData.CONFIGURATION_BLOCK_2.length > 1 &&
            templateData.CONFIGURATION_BLOCK_3 &&
            templateData.CONFIGURATION_BLOCK_3.length > 1)
        {
            const templateEndpoint = `
                                        [endpoint-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                        type=endpoint
                                        ${templateData.CONFIGURATION_BLOCK_1}
                                        ${templateData.CONTEXT_ID ? `context=${templateData.CONTEXT_ID}` : null}
                                    `
            const templateAuth = `
                                        [auth-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                        type=auth
                                        ${templateData.CONFIGURATION_BLOCK_2}
                                    `    
            const templateAor = `
                                    [aor-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                    type=aor
                                    ${templateData.CONFIGURATION_BLOCK_3}
                                `
            
            dataTemplate.push(await this.cleanLines(templateEndpoint))
            dataTemplate.push(await this.cleanLines(templateAuth))
            dataTemplate.push(await this.cleanLines(templateAor))
        } else {
            const templateConfiguration = `
                                        [${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                        ${templateData.CONFIGURATION_BLOCK_1}
                                    `
            dataTemplate.push(await this.cleanLines(templateConfiguration))
        }

        await this.writeFile(filename,dataTemplate)
    }

    async createPJSIP (peerData){
        const dataPeer = []
        const filename = `${this.folder_call_centers}/${peerData.CALL_CENTER_ID}/customers/${peerData.CUSTOMER_ID}/${peerData.TECNOLOGY}/${peerData.PEER_ID}.conf`
    
        let endpoint =    `
                                [${peerData.PEER_ID}](endpoint-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                                auth=auth${peerData.PEER_ID}
                                aors=${peerData.PEER_ID}
                                callerid=${peerData.CALLER_NAME} <${peerData.CALLER_NUM}>
                            `
        let auth =    `
                            [auth${peerData.PEER_ID}](auth-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                            username=${peerData.PEER_ID}

                        `
        let aor =     `
                            [${peerData.PEER_ID}](aor-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                        `
        if(!peerData.DEFAULT_PASSWORD && peerData.PASSWORD){
            auth = auth +`\nsecret=${peerData.PASSWORD}`
        }


        if(!peerData.DEFAULT_CODECS && peerData.CODECS){
            endpoint = endpoint + `\ncodecs=${peerData.CODECS}`
        }
                
        dataPeer.push(await this.cleanLines(endpoint))
        dataPeer.push(await this.cleanLines(auth))
        dataPeer.push(await this.cleanLines(aor))

        await this.writeFile(filename,dataPeer)
    }

    async update(objData) {
        console.log(objData);
        await this.prepareBasicFolders()
        const listCallCenter = await this.listCallCenter(objData)
        const listCustomer = await this.listCustomer(objData)

        if (listCallCenter.length > 0 && listCustomer.length > 0) {
            await Promise.all(listCallCenter.map(async callCenter => {
                const folder_call_center = `${this.folder_call_centers}/${callCenter}`
                await this.createFolders(folder_call_center)

                const folder_contexts = `${this.folder_call_centers}/${callCenter}/contexts`
                await this.createFolders(folder_contexts)

                const folder_templates = `${this.folder_call_centers}/${callCenter}/templates`
                await this.createFolders(folder_templates)

                const folder_queues = `${this.folder_call_centers}/${callCenter}/queues`
                await this.createFolders(folder_queues)

                await Promise.all(listCustomer.map(async customer => {

                    const folder_customer = `${this.folder_call_centers}/${callCenter}/customers/${customer}`
                    await this.createFolders(folder_customer)

                    const folder_customer_tecnology_sip = `${this.folder_call_centers}/${callCenter}/customers/${customer}/SIP`
                    await this.createFolders(folder_customer_tecnology_sip)

                    const folder_customer_tecnology_pjsip = `${this.folder_call_centers}/${callCenter}/customers/${customer}/PJSIP`
                    await this.createFolders(folder_customer_tecnology_pjsip)

                    const folder_customer_tecnology_iax = `${this.folder_call_centers}/${callCenter}/customers/${customer}/IAX2`
                    await this.createFolders(folder_customer_tecnology_iax)

                }))
                .then(() => {
                    objData.basicFiles.forEach(basicFiles => {
                        const filename = `${basicFiles.PATH}/${basicFiles.FILENAME}`
                        const row = []
                        row.push(`${basicFiles.CONTENT}`)
                        this.writeFile(filename,row)
                    })

                    objData.queues.forEach(async queue => {
                        await this.createQueue(queue)
                    })

                    objData.contexts.forEach(async context => {
                        await this.createContext(context)
                    })

                    objData.templates.forEach(async template => {
                            await this.createTemplate(template)
                    })

                    objData.peers.forEach(async peer => {
                        if (peer.TECNOLOGY === 'PJSIP'){
                            await this.createPJSIP(peer)
                        }
                        
                    })
                })
            }))
        }
    }
}

module.exports = new AsteriskModel();

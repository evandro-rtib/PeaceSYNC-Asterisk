const fs = require('fs');
const fse = require('fs-extra');
const mariadb = require('mariadb')
const dbConfig = require('../configs/db')
const hubConfig = require('../configs/hub')
const axios = require('axios');
const hub = require('../configs/hub');
const { exec } = require('child_process');


class AsteriskModel {

    constructor() {
        this.folder_asterisk = '/etc/asterisk';
        this.folder_call_centers = `${this.folder_asterisk}/call_centers`;
        this.folder_globals = `${this.folder_asterisk}/globals`;
        this.folder_scripts = `${this.folder_asterisk}/scripts`;
        this.folder_scripts = `${this.folder_asterisk}/python`;
        this.connection = null
        this.initConnection()
    }

    async initConnection() {
        try {
            const pool = await mariadb.createPool(dbConfig)
            this.connection = await pool.getConnection()
        } catch (error) {
            console.log(error)
        }
    }

    async prepareBasicFolders() {
        await this.deleteFolder(this.folder_call_centers)

        try {
            await Promise.all([
                (async () => {
                    try {
                        await this.createFolders(this.folder_asterisk);
                    } catch (err) {
                        console.error(`Erro ao criar a pasta ${this.folder_asterisk}:`, err);
                    }
                })(),
                (async () => {
                    try {
                        await this.createFolders(this.folder_call_centers);
                    } catch (err) {
                        console.error(`Erro ao criar a pasta ${this.folder_call_centers}:`, err);
                    }
                })(),
                (async () => {
                    try {
                        await this.createFolders(this.folder_globals);
                    } catch (err) {
                        console.error(`Erro ao criar a pasta ${this.folder_globals}:`, err);
                    }
                })(),
                (async () => {
                    try {
                        await this.createFolders(this.folder_scripts);
                    } catch (err) {
                        console.error(`Erro ao criar a pasta ${this.folder_scripts}:`, err);
                    }
                })()
            ]);
        } catch (err) {
            console.error("Erro ao criar as pastas:", err);
        }
    }

    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erro ao executar o comando: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error(`Erro na saída do comando: ${stderr}`);
                    reject(new Error(stderr));
                    return;
                }
                console.log(`Saída do comando: ${stdout}`);
                resolve(stdout);
            });
        });
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
                const test = list.find(e => e.CALL_CENTER_ID == obj.CALL_CENTER_ID)
                if (!test) {
                    list.push({ CALL_CENTER_ID: obj.CALL_CENTER_ID })
                }
            }
        })
        return list
    }

    async listCustomer(objData) {
        const list = []
        objData.peers.forEach(obj => {
            if (obj.CUSTOMER_ID && obj.CALL_CENTER_ID) {
                const test = list.find(e => e.CUSTOMER_ID == obj.CUSTOMER_ID && e.CALL_CENTER_ID == obj.CALL_CENTER_ID)
                if (!test) {
                    list.push({ CALL_CENTER_ID: obj.CALL_CENTER_ID, CUSTOMER_ID: obj.CUSTOMER_ID })
                }
            }
        })
        return list
    }

    async writeFile(filename, rows) {
        return new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filename);
            stream.on('error', err => {
                reject(err);
            });

            stream.on('finish', () => {
                fs.chmod(filename, '755', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            rows.forEach(row => {
                stream.write(row + '\n');
            });

            stream.end();
        });
    }

    async deleteFolder(folder) {
        return new Promise((resolve, reject) => {
            fse.remove(folder, err => {
                if (err) {
                    console.error(`Erro ao excluir a pasta: ${folder}`, err);
                    reject(err);
                } else {
                    console.log(`Pasta ${folder} excluída com sucesso.`);
                    resolve();
                }
            });
        });
        // fse.remove(folder, err => {
        //     if (err) {
        //         console.error(`Erro ao excluir a pasta: ${folder}`, err);
        //     } else {
        //         console.log(`Pasta ${folder} excluída com sucesso.`);
        //     }
        // });
    }

    async cleanLines(lines) {
        let separateLines = lines.split('\n')
        let cleanLine = separateLines.map(line => line.trim())
        let newLines = cleanLine.join('\n')
        return newLines
    }

    async createContext(contextData) {
        const dataContext = []
        const filename = `${this.folder_call_centers}/${contextData.CALL_CENTER_ID}/contexts/${contextData.ID}.conf`
        const contextConfiguration = `
                                        [${contextData.ID}] ; ${contextData.CONTEXT_NAME}
                                        ${contextData.EXTENSIONS_BLOCK}
                                    `
        dataContext.push(await this.cleanLines(contextConfiguration))

        await this.writeFile(filename, dataContext)
    }

    async createQueue(queueData) {
        const dataQueue = []
        const filename = `${this.folder_call_centers}/${queueData.CALL_CENTER_ID}/queues/${queueData.ID}.conf`
        let associatedPeers = ""
        queueData.associatedPeers.forEach(member => { associatedPeers += `member=${member.TECNOLOGY}/${member.PEER_ID} ; ${member.CALLER_NUM} : ${member.CALLER_NAME}\n` })
        const queueConfiguration = `
                                        [${queueData.ID}] ; ${queueData.QUEUE_NAME}
                                        strategy=${queueData.STRATEGY}
                                        setinterfacevar=yes
                                        setqueuevar=yes
                                        ${associatedPeers}
                                    `
        dataQueue.push(await this.cleanLines(queueConfiguration))

        await this.writeFile(filename, dataQueue)
    }

    async createTemplate(templateData) {
        const dataTemplate = []
        const filename = `${this.folder_call_centers}/${templateData.CALL_CENTER_ID}/templates/${templateData.ID}.conf`
        if (templateData.CONFIGURATION_BLOCK_2 &&
            templateData.CONFIGURATION_BLOCK_2.length > 1 &&
            templateData.CONFIGURATION_BLOCK_3 &&
            templateData.CONFIGURATION_BLOCK_3.length > 1) {
            const templateEndpoint = `
                                        [endpoint-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                        ${templateData.CONFIGURATION_BLOCK_1}
                                    `
            const templateAuth = `
                                        [auth-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
                                        ${templateData.CONFIGURATION_BLOCK_2}
                                    `
            const templateAor = `
                                    [aor-${templateData.ID}](!) ; ${templateData.TEMPLATE_NAME}
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

        await this.writeFile(filename, dataTemplate)
    }

    async createPeerPJSIP(peerData) {
        const dataPeer = []
        const filename = `${this.folder_call_centers}/${peerData.CALL_CENTER_ID}/customers/${peerData.CUSTOMER_ID}/${peerData.TECNOLOGY}/${peerData.PEER_ID}.conf`

        let endpoint = `
                                [${peerData.PEER_ID}](endpoint-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                                auth=auth${peerData.PEER_ID}
                                aors=${peerData.PEER_ID}
                                callerid=${peerData.CALLER_NAME} <${peerData.CALLER_NUM}>
                                set_var=SOURCE_PEER_ID=${peerData.PEER_ID}
                                set_var=CALL_CENTER_ID=${peerData.CALL_CENTER_ID}
                                set_var=CALL_CENTER_NAME=${peerData.CALL_CENTER_NAME}
                                set_var=CUSTOMER_ID=${peerData.CUSTOMER_ID}
                                set_var=CUSTOMER_NAME=${peerData.CUSTOMER_NAME}
                            `
        let auth = `
                            [auth${peerData.PEER_ID}](auth-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                            username=${peerData.PEER_ID}
                        `
        let aor = `
                            [${peerData.PEER_ID}](aor-${peerData.TEMPLATE_ID}) ; ${peerData.CALLER_NUM} - ${peerData.CALLER_NAME}
                        `
        if (!peerData.DEFAULT_PASSWORD && peerData.PASSWORD) {
            auth = auth + `\npassword=${peerData.PASSWORD}`
        }


        if (!peerData.DEFAULT_CODECS && peerData.CODECS) {
            endpoint = endpoint + `\ncodecs=${peerData.CODECS}`
        }

        dataPeer.push(await this.cleanLines(endpoint))
        dataPeer.push(await this.cleanLines(auth))
        dataPeer.push(await this.cleanLines(aor))

        await this.writeFile(filename, dataPeer)
    }

    async createTrunkOperatorPJSIP(trunkData) {
        const dataTrunk = []
        const filename = `${this.folder_call_centers}/${trunkData.CALL_CENTER_ID}/customers/${trunkData.CUSTOMER_ID}/${trunkData.TECNOLOGY}/trunk-${trunkData.ID}.conf`

        let registration = `
                                [trunk-${trunkData.ID}-registration] ; ${trunkData.OPERATOR_NAME}
                                type=registration
                                transport=transport-udp
                                outbound_auth=auth-trunk-${trunkData.ID}
                                server_uri=sip:${trunkData.ADDRESS}:${trunkData.PORT}
                                client_uri=sip:${trunkData.ACCOUNT}@${trunkData.ADDRESS}:${trunkData.PORT}
                                contact_user=${trunkData.ACCOUNT}
                                retry_interval=60
                                line=yes
                                endpoint=trunk-${trunkData.ID}
                            `

        let endpoint = `
                                [trunk-${trunkData.ID}](endpoint-${trunkData.TEMPLATE_ID}) ; ${trunkData.OPERATOR_NAME}
                                outbound_auth=auth-trunk-${trunkData.ID}
                                aors=trunk-${trunkData.ID}
                                set_var=CALL_CENTER_ID=${trunkData.CALL_CENTER_ID}
                                set_var=CALL_CENTER_NAME=${trunkData.CALL_CENTER_NAME}
                                set_var=CUSTOMER_ID=${trunkData.CUSTOMER_ID}
                                set_var=CUSTOMER_NAME=${trunkData.CUSTOMER_NAME}
                            `
        let auth = `
                            [auth-trunk-${trunkData.ID}](auth-${trunkData.TEMPLATE_ID}) ; ${trunkData.OPERATOR_NAME}
                            username=${trunkData.ACCOUNT}
                            password=${trunkData.PASSWORD}

                        `
        let aor = `
                            [trunk-${trunkData.ID}](aor-${trunkData.TEMPLATE_ID}) ; ${trunkData.OPERATOR_NAME}
                            contact=sip:${trunkData.ACCOUNT}@${trunkData.ADDRESS}
                            qualify_frequency=0

                      `
        let identify = `
                            [trunk-${trunkData.ID}-identify] ; ${trunkData.OPERATOR_NAME}
                            type=identify
                            endpoint=trunk-${trunkData.ID}
                            match=${trunkData.ADDRESS}
                        `

        if (!trunkData.DEFAULT_CODECS && trunkData.CODECS) {
            endpoint = endpoint + `\ncodecs=${trunkData.CODECS}`
        }

        dataTrunk.push(await this.cleanLines(registration))
        dataTrunk.push(await this.cleanLines(endpoint))
        dataTrunk.push(await this.cleanLines(auth))
        dataTrunk.push(await this.cleanLines(aor))
        dataTrunk.push(await this.cleanLines(identify))

        await this.writeFile(filename, dataTrunk)
    }

    async update(objData) {
        try {
            if (objData.EQUIPMENT_ID) {
                let query = ` DELETE FROM
                                    TB_EQUIPMENT
                                WHERE
                                    EQUIPMENT_ID > 0
                        `
                await this.connection.beginTransaction()
                await this.connection.execute(query)
                await this.connection.commit()
                query = `   INSERT INTO
                                TB_EQUIPMENT
                                (EQUIPMENT_ID)
                            VALUES
                                (${objData.EQUIPMENT_ID})
                        `
                await this.connection.beginTransaction()
                await this.connection.execute(query)
                await this.connection.commit()

                await this.prepareBasicFolders();
                const listCallCenter = await this.listCallCenter(objData);
                const listCustomer = await this.listCustomer(objData);

                if (listCallCenter.length > 0 && listCustomer.length > 0) {
                    await Promise.all(listCallCenter.map(async callCenter => {
                        const folder_call_center = `${this.folder_call_centers}/${callCenter.CALL_CENTER_ID}`;
                        await this.createFolders(folder_call_center);

                        const folder_contexts = `${folder_call_center}/contexts`;
                        const folder_templates = `${folder_call_center}/templates`;
                        const folder_queues = `${folder_call_center}/queues`;

                        await Promise.all([
                            this.createFolders(folder_contexts),
                            this.createFolders(folder_templates),
                            this.createFolders(folder_queues)
                        ]);

                        await Promise.all(listCustomer.map(async customer => {
                            const folder_customer = `${folder_call_center}/customers/${customer.CUSTOMER_ID}`;
                            const folder_customer_tecnology_sip = `${folder_customer}/SIP`;
                            const folder_customer_tecnology_pjsip = `${folder_customer}/PJSIP`;
                            const folder_customer_tecnology_iax = `${folder_customer}/IAX2`;

                            await Promise.all([
                                this.createFolders(folder_customer),
                                this.createFolders(folder_customer_tecnology_sip),
                                this.createFolders(folder_customer_tecnology_pjsip),
                                this.createFolders(folder_customer_tecnology_iax)
                            ]);
                        }));

                        await Promise.all([
                            Promise.all(objData.basicFiles.map(async basicFiles => {
                                const filename = `${basicFiles.PATH}/${basicFiles.FILENAME}`;
                                const row = [`${basicFiles.CONTENT}`];
                                await this.writeFile(filename, row);
                            })),
                            Promise.all(objData.queues.map(async queue => {
                                await this.createQueue(queue);
                            })),
                            Promise.all(objData.contexts.map(async context => {
                                await this.createContext(context);
                            })),
                            Promise.all(objData.templates.map(async template => {
                                await this.createTemplate(template);
                            })),
                            Promise.all(objData.peers.map(async peer => {
                                if (peer.TECNOLOGY === 'PJSIP') {
                                    await this.createPeerPJSIP(peer);
                                }
                            })),
                            Promise.all(objData.trunkOperator.map(async trunk => {
                                if (trunk.TECNOLOGY === 'PJSIP') {
                                    await this.createTrunkOperatorPJSIP(trunk);
                                }
                            }))
                        ]);
                    }));
                    console.log('Todas as pastas de callcenter foram criadas.');
                    const result = await this.executeCommand("asterisk -rx 'core reload'");
                    console.log("Comando executado com sucesso:", result);

                }
            }
        } catch (err) {
            console.error("Erro ao atualizar:", err);
        }
    }

    async get_Equipament() {
        const query = `   SELECT
                                EQUIPMENT_ID
                            FROM
                                TB_EQUIPMENT
                            LIMIT 1
                        `
        const result = await this.connection.execute(query)
        if (result.length > 0)
            return result[0]
        else
            return 0
    }

    async converterWavToMp3(source) {
        const command = `/bin/bash /etc/asterisk/scripts/converterWavToMp3.sh ${source}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro ao converter: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Erro ao converter: ${stderr}`);
                return;
            }
            console.log(`Conversão finalizada: ${stdout}`);
        });
    };

    async agentLogin(objData) {
        const AGENT_NAME = objData.AGENT_NAME;
        const PEER_ID = objData.PEER_ID;
        const command = `asterisk -rx 'database put AGENTS ${PEER_ID}/AGENT_NAME \"${AGENT_NAME}\"'`
        console.log(command)
        await this.executeCommand(command);
        return []
    }

    async agentLogoff(objData) {
        const PEER_ID = objData.PEER_ID;
        const command = `asterisk -rx 'database del AGENTS ${PEER_ID}/AGENT_NAME '`
        await this.executeCommand(command);
        return []
    }

    async PEER_TO_PEER(objData) {
        let equipment = await this.get_Equipament()
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const CALL_TYPE = objData.CALL_TYPE ? objData.CALL_TYPE : 'NULL'
        const CALL_CENTER_ID = objData.CALL_CENTER_ID
        const CALL_CENTER_NAME = objData.CALL_CENTER_NAME
        const CUSTOMER_ID = objData.CUSTOMER_ID
        const CUSTOMER_NAME = objData.CUSTOMER_NAME
        const SOURCE_PEER_ID = objData.SOURCE_PEER_ID > 0 ? objData.SOURCE_PEER_ID : objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NUM = objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NAME = objData.SOURCE_PEER_CALLER_NAME
        const DESTINATION_PEER_ID = objData.DESTINATION_PEER_ID > 0 ? objData.DESTINATION_PEER_ID : 'NULL'
        const DESTINATION_PEER_CALLER_NUM = objData.DESTINATION_PEER_CALLER_NUM
        const DESTINATION_PEER_CALLER_NAME = objData.DESTINATION_PEER_CALLER_NAME
        const UNIQUEID = objData.UNIQUEID
        const RECORD_FILE = objData.RECORD_FILE
        const SOURCE_AGENT_ID = objData.SOURCE_AGENT_ID > 0 ? objData.SOURCE_AGENT_ID : 'NULL'

        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                CALL_TYPE: CALL_TYPE,
                CALL_CENTER_ID: CALL_CENTER_ID,
                CALL_CENTER_NAME: CALL_CENTER_NAME,
                CUSTOMER_ID: CUSTOMER_ID,
                CUSTOMER_NAME: CUSTOMER_NAME,
                SOURCE_PEER_ID: SOURCE_PEER_ID,
                SOURCE_PEER_CALLER_NUM: SOURCE_PEER_CALLER_NUM,
                SOURCE_PEER_CALLER_NAME: SOURCE_PEER_CALLER_NAME,
                SOURCE_AGENT_ID: SOURCE_AGENT_ID,
                DESTINATION_PEER_ID: DESTINATION_PEER_ID,
                DESTINATION_PEER_CALLER_NUM: DESTINATION_PEER_CALLER_NUM,
                DESTINATION_PEER_CALLER_NAME: DESTINATION_PEER_CALLER_NAME,
                UNIQUEID: UNIQUEID,
                RECORD_FILE: RECORD_FILE
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/PEER_TO_PEER`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }

        try {
            const query = ` INSERT INTO
                                TB_CDR
                                (
                                    CALL_TYPE,
                                    CALL_CENTER_ID,
                                    CALL_CENTER_NAME,
                                    CUSTOMER_ID,
                                    CUSTOMER_NAME,
                                    SOURCE_PEER_ID,
                                    SOURCE_PEER_CALLER_NUM,
                                    SOURCE_PEER_CALLER_NAME,
                                    SOURCE_AGENT_ID,
                                    DESTINATION_PEER_ID,
                                    DESTINATION_PEER_CALLER_NUM,
                                    DESTINATION_PEER_CALLER_NAME,
                                    UNIQUEID,
                                    RECORD_FILE,
                                    DATE_START
                                )
                            VALUES
                                (
                                    "${CALL_TYPE}",
                                    ${CALL_CENTER_ID},
                                    "${CALL_CENTER_NAME}",
                                    ${CUSTOMER_ID},
                                    "${CUSTOMER_NAME}",
                                    "${SOURCE_PEER_ID}",
                                    "${SOURCE_PEER_CALLER_NUM}",
                                    "${SOURCE_PEER_CALLER_NAME}",
                                    ${SOURCE_AGENT_ID},
                                    "${DESTINATION_PEER_ID}",
                                    "${DESTINATION_PEER_CALLER_NUM}",
                                    "${DESTINATION_PEER_CALLER_NAME}",
                                    "${UNIQUEID}",
                                    "${RECORD_FILE}",
                                    NOW()
                                )
                        `
            await this.connection.beginTransaction()
            console.log(query);
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }

    async PEER_TO_TRUNK(objData) {
        let equipment = await this.get_Equipament()
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const CALL_TYPE = objData.CALL_TYPE ? objData.CALL_TYPE : 'NULL'
        const CALL_CENTER_ID = objData.CALL_CENTER_ID
        const CALL_CENTER_NAME = objData.CALL_CENTER_NAME
        const CUSTOMER_ID = objData.CUSTOMER_ID
        const CUSTOMER_NAME = objData.CUSTOMER_NAME
        const SOURCE_PEER_ID = objData.SOURCE_PEER_ID > 0 ? objData.SOURCE_PEER_ID : objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NUM = objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NAME = objData.SOURCE_PEER_CALLER_NAME
        const DESTINATION_PEER_ID = objData.DESTINATION_PEER_ID > 0 ? objData.DESTINATION_PEER_ID : 'NULL'
        const DESTINATION_PEER_CALLER_NUM = objData.DESTINATION_PEER_CALLER_NUM
        const DESTINATION_PEER_CALLER_NAME = objData.DESTINATION_PEER_CALLER_NAME
        const UNIQUEID = objData.UNIQUEID
        const RECORD_FILE = objData.RECORD_FILE
        const SOURCE_AGENT_ID = objData.SOURCE_AGENT_ID > 0 ? objData.SOURCE_AGENT_ID : 'NULL'
        const DESTINATION_POS_PEER = objData.DESTINATION_POS_PEER

        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                CALL_TYPE: CALL_TYPE,
                CALL_CENTER_ID: CALL_CENTER_ID,
                CALL_CENTER_NAME: CALL_CENTER_NAME,
                CUSTOMER_ID: CUSTOMER_ID,
                CUSTOMER_NAME: CUSTOMER_NAME,
                SOURCE_PEER_ID: SOURCE_PEER_ID,
                SOURCE_PEER_CALLER_NUM: SOURCE_PEER_CALLER_NUM,
                SOURCE_PEER_CALLER_NAME: SOURCE_PEER_CALLER_NAME,
                SOURCE_AGENT_ID: SOURCE_AGENT_ID,
                DESTINATION_PEER_ID: DESTINATION_PEER_ID,
                DESTINATION_PEER_CALLER_NUM: DESTINATION_PEER_CALLER_NUM,
                DESTINATION_PEER_CALLER_NAME: DESTINATION_PEER_CALLER_NAME,
                UNIQUEID: UNIQUEID,
                RECORD_FILE: RECORD_FILE,
                DESTINATION_POS_PEER: DESTINATION_POS_PEER
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/PEER_TO_TRUNK`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }

        try {
            const query = ` INSERT INTO
                                TB_CDR
                                (
                                    CALL_TYPE,
                                    CALL_CENTER_ID,
                                    CALL_CENTER_NAME,
                                    CUSTOMER_ID,
                                    CUSTOMER_NAME,
                                    SOURCE_PEER_ID,
                                    SOURCE_PEER_CALLER_NUM,
                                    SOURCE_PEER_CALLER_NAME,
                                    SOURCE_AGENT_ID,
                                    DESTINATION_PEER_ID,
                                    DESTINATION_PEER_CALLER_NUM,
                                    DESTINATION_PEER_CALLER_NAME,
                                    UNIQUEID,
                                    RECORD_FILE,
                                    DESTINATION_POS_PEER,
                                    DATE_START
                                )
                            VALUES
                                (
                                    "${CALL_TYPE}",
                                    ${CALL_CENTER_ID},
                                    "${CALL_CENTER_NAME}",
                                    ${CUSTOMER_ID},
                                    "${CUSTOMER_NAME}",
                                    "${SOURCE_PEER_ID}",
                                    "${SOURCE_PEER_CALLER_NUM}",
                                    "${SOURCE_PEER_CALLER_NAME}",
                                    ${SOURCE_AGENT_ID},
                                    "${DESTINATION_PEER_ID}",
                                    "${DESTINATION_PEER_CALLER_NUM}",
                                    "${DESTINATION_PEER_CALLER_NAME}",
                                    "${UNIQUEID}",
                                    "${RECORD_FILE}",
                                    "${DESTINATION_POS_PEER}",
                                    NOW()
                                )
                        `
            await this.connection.beginTransaction()
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }

    async PEER_TO_QUEUE(objData) {
        let equipment = await this.get_Equipament() 
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const CALL_TYPE = objData.CALL_TYPE ? objData.CALL_TYPE : 'NULL'
        const CALL_CENTER_ID = objData.CALL_CENTER_ID
        const CALL_CENTER_NAME = objData.CALL_CENTER_NAME
        const CUSTOMER_ID = objData.CUSTOMER_ID
        const CUSTOMER_NAME = objData.CUSTOMER_NAME
        const SOURCE_PEER_ID = objData.SOURCE_PEER_ID > 0 ? objData.SOURCE_PEER_ID : objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NUM = objData.SOURCE_PEER_CALLER_NUM
        const SOURCE_PEER_CALLER_NAME = objData.SOURCE_PEER_CALLER_NAME
        const DESTINATION_PEER_ID = objData.DESTINATION_PEER_ID > 0 ? objData.DESTINATION_PEER_ID : 'NULL'
        const DESTINATION_PEER_CALLER_NUM = objData.DESTINATION_PEER_CALLER_NUM
        const DESTINATION_PEER_CALLER_NAME = objData.DESTINATION_PEER_CALLER_NAME
        const UNIQUEID = objData.UNIQUEID
        const RECORD_FILE = objData.RECORD_FILE
        const SOURCE_AGENT_ID = objData.SOURCE_AGENT_ID > 0 ? objData.SOURCE_AGENT_ID : 'NULL'
        const DESTINATION_QUEUE_ID = objData.DESTINATION_QUEUE_ID

        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                CALL_TYPE: CALL_TYPE,
                CALL_CENTER_ID: CALL_CENTER_ID,
                CALL_CENTER_NAME: CALL_CENTER_NAME,
                CUSTOMER_ID: CUSTOMER_ID,
                CUSTOMER_NAME: CUSTOMER_NAME,
                SOURCE_PEER_ID: SOURCE_PEER_ID,
                SOURCE_PEER_CALLER_NUM: SOURCE_PEER_CALLER_NUM,
                SOURCE_PEER_CALLER_NAME: SOURCE_PEER_CALLER_NAME,
                SOURCE_AGENT_ID: SOURCE_AGENT_ID,
                DESTINATION_PEER_ID: DESTINATION_PEER_ID,
                DESTINATION_PEER_CALLER_NUM: DESTINATION_PEER_CALLER_NUM,
                DESTINATION_PEER_CALLER_NAME: DESTINATION_PEER_CALLER_NAME,
                UNIQUEID: UNIQUEID,
                RECORD_FILE: RECORD_FILE,
                DESTINATION_QUEUE_ID: DESTINATION_QUEUE_ID
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/PEER_TO_QUEUE`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }

        try {
            const query = ` INSERT INTO
                                TB_CDR
                                (
                                    CALL_TYPE,
                                    CALL_CENTER_ID,
                                    CALL_CENTER_NAME,
                                    CUSTOMER_ID,
                                    CUSTOMER_NAME,
                                    SOURCE_PEER_ID,
                                    SOURCE_PEER_CALLER_NUM,
                                    SOURCE_PEER_CALLER_NAME,
                                    SOURCE_AGENT_ID,
                                    DESTINATION_PEER_ID,
                                    DESTINATION_PEER_CALLER_NUM,
                                    DESTINATION_PEER_CALLER_NAME,
                                    UNIQUEID,
                                    RECORD_FILE,
                                    DESTINATION_QUEUE_ID,
                                    DATE_START
                                )
                            VALUES
                                (
                                    "${CALL_TYPE}",
                                    ${CALL_CENTER_ID},
                                    "${CALL_CENTER_NAME}",
                                    ${CUSTOMER_ID},
                                    "${CUSTOMER_NAME}",
                                    "${SOURCE_PEER_ID}",
                                    "${SOURCE_PEER_CALLER_NUM}",
                                    "${SOURCE_PEER_CALLER_NAME}",
                                    ${SOURCE_AGENT_ID},
                                    "${DESTINATION_PEER_ID}",
                                    "${DESTINATION_PEER_CALLER_NUM}",
                                    "${DESTINATION_PEER_CALLER_NAME}",
                                    "${UNIQUEID}",
                                    "${RECORD_FILE}",
                                    ${DESTINATION_QUEUE_ID},
                                    NOW()
                                )
                        `
            await this.connection.beginTransaction()
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }

    async CALL_ANSWERED(objData) {
        let equipment = await this.get_Equipament()
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const UNIQUEID = objData.UNIQUEID

        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                UNIQUEID: UNIQUEID
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/CALL_ANSWERED`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }

        try {
            const query = ` UPDATE
                                TB_CDR
                            SET
                                DATE_ANSWER = NOW(),
                                WAITING_TIME = IFNULL(TIMESTAMPDIFF(SECOND, DATE_START, DATE_ANSWER), TIMESTAMPDIFF(SECOND, DATE_START, NOW()))
                            WHERE
                                UNIQUEID = "${UNIQUEID}"
                        `
            await this.connection.beginTransaction()
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }

    async ANSWERED_QUEUE(objData) {
        let equipment = await this.get_Equipament()
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const UNIQUEID = objData.UNIQUEID
        const DESTINATION_AGENT_NAME = objData.DESTINATION_AGENT_NAME
        let DESTINATION_AGENT_ID = objData.DESTINATION_AGENT_ID
        if (DESTINATION_AGENT_ID.includes('/')) {
            const array = DESTINATION_AGENT_ID.split('/')
            DESTINATION_AGENT_ID = array[1]
        }
        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                UNIQUEID: UNIQUEID,
                DESTINATION_AGENT_ID: DESTINATION_AGENT_ID,
                DESTINATION_AGENT_NAME: DESTINATION_AGENT_NAME
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/ANSWERED_QUEUE`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }

        try {
            const query = ` UPDATE
                                TB_CDR
                            SET
                                DATE_ANSWER = NOW(),
                                WAITING_TIME = IFNULL(TIMESTAMPDIFF(SECOND, DATE_START, DATE_ANSWER), TIMESTAMPDIFF(SECOND, DATE_START, NOW())),
                                DESTINATION_AGENT_ID=${DESTINATION_AGENT_ID}
                                ${DESTINATION_AGENT_NAME?`,DESTINATION_AGENT_NAME=${DESTINATION_AGENT_NAME}`: ''}
                            WHERE
                                UNIQUEID = "${UNIQUEID}"
                        `
            await this.connection.beginTransaction()
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }

    async END_CALL(objData) {
        let equipment = await this.get_Equipament()
        const EQUIPMENT_ID = equipment.EQUIPMENT_ID
        const UNIQUEID = objData.UNIQUEID
        try {
            const query = ` SELECT
                                RECORD_FILE
                            FROM
                                TB_CDR
                            WHERE
                                UNIQUEID=${UNIQUEID}
                        `;
            const results = await this.connection.execute(query)
            const RECORD_FILE = results[0].RECORD_FILE
            await this.converterWavToMp3(RECORD_FILE)
        } catch (error) {
            console.log(error)
        }

        try {
            const confData = {
                EQUIPMENT_ID: EQUIPMENT_ID,
                UNIQUEID: UNIQUEID,
            }
            const url = `http://${hub.host}:${hub.port}/asterisk/cdr/END_CALL`;
            const response = await axios.post(`${url}`, confData);
        } catch (error) {
            console.log(error)
        }


        try {
            const query = ` UPDATE
                                TB_CDR
                            SET
                                DATE_END = NOW(),
                                WAITING_TIME = IFNULL(TIMESTAMPDIFF(SECOND, DATE_START, DATE_ANSWER), TIMESTAMPDIFF(SECOND, DATE_START, NOW())),
                                TALK_TIME = IFNULL(TIMESTAMPDIFF(SECOND, DATE_ANSWER, NOW()), 0),
                                DURATION = TIMESTAMPDIFF(SECOND, DATE_START, NOW()),
                                RECORD_FILE = REPLACE(RECORD_FILE, '.wav', '.mp3')
                            WHERE
                                UNIQUEID = "${UNIQUEID}"
                        `
            await this.connection.beginTransaction()
            const results = await this.connection.execute(query)
            await this.connection.commit()
            return results
        } catch (error) {
            console.log(error)
        }
    }



}

module.exports = new AsteriskModel();

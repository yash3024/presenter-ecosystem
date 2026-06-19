session = await ai.live.connect({
            model: MODEL_NAME,
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: { parts: [{ text: baseInstruction }] },
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                    languageCode: "hi-IN"
                },
                tools: [{
                    functionDeclarations: [{
                        name: "send_loan_recovery_email",
                        description: "Send a loan recovery payment reminder email to a customer with outstanding amount and payment link",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                recipientEmail: {
                                    type: "STRING",
                                    description: "Customer email address"
                                },
                                recipientName: {
                                    type: "STRING",
                                    description: "Customer full name"
                                },
                                outstandingAmount: {
                                    type: "NUMBER",
                                    description: "Outstanding loan amount to be paid"
                                },
                                paymentUrl: {
                                    type: "STRING",
                                    description: "Payment link for loan repayment"
                                }
                            },
                            required: [
                                "recipientEmail",
                                "recipientName",
                                "outstandingAmount",
                                "paymentUrl"
                           ]
                        }
                    }
		    /* ,{
                        name: "end_call",
                        description: "End the collection call and save call disposition details",

                        parameters: {
                            type: "OBJECT",

                            properties: {

                                dispositionType: {
                                    type: "STRING",
                                    description: `
Call disposition type.

Allowed values:
- cb = Callback
- rtp = Refuse to Pay
- ptp = Promise to Pay
- dis = Dispute
- ws = Want Settlement
- de = Death Case
- ccu = Customer Cut Call / Call Cut Unexpectedly
- cbil = CIBIL Cleanup Request
                        `,
                                    enum: [
                                        "cb",
                                        "rtp",
                                        "ptp",
                                        "dis",
                                        "ws",
                                        "de",
                                        "ccu",
                                        "cbil"
                                    ]
                                },

                                remarks: {
                                    type: "STRING",
                                    description: "Short summary of the conversation"
                                },

                                callbackDate: {
                                    type: "STRING",
                                    description: `
Required if dispositionType = cb.
Callback follow-up date and time in ISO format.
Example: 2026-05-25T14:30:00
                        `
                                },

                                ptpAmount: {
                                    type: "NUMBER",
                                    description: `
Required if dispositionType = ptp.
Promised payment amount.
                        `
                                },

                                ptpDate: {
                                    type: "STRING",
                                    description: `
Required if dispositionType = ptp.
Promised payment date in ISO format.
Example: 2026-05-28
                        `
                                },

                                settlementAmount: {
                                    type: "NUMBER",
                                    description: `
Optional if dispositionType = ws.
Settlement amount discussed with customer.
                        `
                                },

                                disputeReason: {
                                    type: "STRING",
                                    description: `
Required if dispositionType = dis.
Reason for dispute raised by customer.
                        `
                                },

                                deceasedRelation: {
                                    type: "STRING",
                                    description: `
Optional if dispositionType = de.
Who informed about death.
Example: Son, Wife, Brother
                        `
                                },

                                cibilIssue: {
                                    type: "STRING",
                                    description: `
Optional if dispositionType = cbil.
CIBIL cleanup related issue or request.
                        `
                                },

                                customerIntent: {
                                    type: "STRING",
                                    description: `
Overall customer intent.
Examples:
- cooperative
- angry
- not interested
- will pay soon
- requested callback
                        `
                                }
                            },

                            required: [
                                "dispositionType",
                                "remarks"
                            ]
                        }
                    }*/

                    ]
                }],
                

            },
            callbacks: {
                onopen: () => console.log(`✅ [Gemini] Session opened for ${socket.remoteAddress}`),
                onclose: () => console.log(`🔌 [Gemini] Session closed.`),
                onerror: (e) => console.error("❌ [Gemini] Error:", e),
                onmessage: (response) => {
                    // Handle tool calls
                    if (response.toolCall) {
                        const functionCalls = response.toolCall.functionCalls;
                        if (functionCalls && functionCalls.length > 0) {
                            const functionResponses = functionCalls.map(call => {
                                if (call.name === 'send_loan_recovery_email') {
                                    console.log("📧 Tool Call: send_loan_recovery_email with args:", call.args);
                                    const { recipientEmail, recipientName, outstandingAmount, paymentUrl } = call.args || {};
                                    if (!recipientEmail || !recipientName || !outstandingAmount || !paymentUrl) {
                                        return {
                                            id: call.id,
                                            name: call.name,
                                            response: { error: 'Invalid arguments' }
                                        };
                                    }

                                    sendMail(recipientEmail, recipientName, outstandingAmount, paymentUrl);

                                    return {
                                        id: call.id,
                                        name: call.name,
                                        response: { result: call.args }
                                    };
                                }else if (call.name === 'end_call') {
                                    console.log("📋 Tool Call: end_call with args:", call.args);

                                    if (callId) {
                                        const { dispositionType, remarks, ...otherDetails } = call.args || {};
                                        fetch('https://ai-agent.devloperhemant.com/api/webhook/call-details', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                callId: callId,
                                                deposition: dispositionType,
                                                remark: remarks,
                                                otherDetails: Object.keys(otherDetails).length > 0 ? otherDetails : undefined
                                            })
                                        })
                                        .then(res => console.log(`✅ Webhook Call-Details sent. Status: ${res.status}`))
                                        .catch(err => console.error("❌ Webhook Call-Details Error:", err.message));
                                    }

                                    try{
                                        session.close();
                                        socket.destroy();
                                    }catch(err){
                                        console.error("❌ Error ending call session:", err);
                                    }
                                }
                                return {
                                    id: call.id,
                                    name: call.name,
                                    response: { error: 'Unknown tool' }
                                };
                            });

                            if (session) {
                                if (typeof session.sendToolResponse === 'function') {
                                    session.sendToolResponse({ functionResponses });
                                } else {
                                    session.send({ toolResponse: { functionResponses } });
                                }

                            }
                        }
                    }

                    // 1. EXTRACT WHAT THE USER SAID (Input Audio Transcript)
                    if (response.serverContent?.inputTranscription?.text) {
                        const userSpeechText = response.serverContent.inputTranscription.text;
                        if (currentSpeaker !== 'user') {
                            callTranscript += (callTranscript ? " , user : " : "user : ");
                            currentSpeaker = 'user';
                        }
                        callTranscript += userSpeechText;


                    }

                    // 2. EXTRACT WHAT THE GEMINI MODEL IS SAYING (Output Audio Transcript)
                    if (response.serverContent?.outputTranscription?.text) {
                        const modelSpeechText = response.serverContent.outputTranscription.text;
                        if (currentSpeaker !== 'model') {
                            callTranscript += (callTranscript ? " , model : " : "model : ");
                            currentSpeaker = 'model';
                        }
                        callTranscript += modelSpeechText;

                    }

                    if (response.serverContent?.modelTurn?.parts) {
                        for (const part of response.serverContent.modelTurn.parts) {
                            if (part.inlineData) {
                                const audio24kHz = Buffer.from(part.inlineData.data, 'base64');
                                geminiBuffer24k = Buffer.concat([geminiBuffer24k, audio24kHz]);

                                const processableBytes = Math.floor(geminiBuffer24k.length / 6) * 6;
                                if (processableBytes > 0) {
                                    const chunkToProcess = geminiBuffer24k.slice(0, processableBytes);
                                    geminiBuffer24k = geminiBuffer24k.slice(processableBytes);

                                    const audio8kHz = downsample24to8(chunkToProcess);
                                    asteriskBuffer8k = Buffer.concat([asteriskBuffer8k, audio8kHz]);
                                }

                                const FRAME_SIZE = 320;
                                while (asteriskBuffer8k.length >= FRAME_SIZE) {
                                    const frame = asteriskBuffer8k.slice(0, FRAME_SIZE);
                                    asteriskBuffer8k = asteriskBuffer8k.slice(FRAME_SIZE);
                                    playoutQueue.push(frame);
                                }
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("❌ [Gemini] Start Error:", err);
    }
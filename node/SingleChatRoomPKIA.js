const Application = require('./Application')
const uuid = require('uuid-random')
const openpgp = require('openpgp')
openpgp.config.preferredAEADAlgorithm = openpgp.enums.aead.experimentalGCM
openpgp.config.show_version = false
openpgp.config.show_comment = false
openpgp.config.aeadProtect = true

class SingleChatRoomPKIA extends Application {
  async input () {
    const { privateKeyArmored, publicKeyArmored } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{}],
      format: 'armor'
    })
    this.publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored })
    this.privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored })
    this.xid = uuid()
    this.message = uuid()
    this.unsignedMessage = await openpgp.createCleartextMessage({ text: this.message })
    return { xid: this.xid, pk: publicKeyArmored }
  }

  async run () {
    const pki = []
    await this.computeStep('construct', async () => {
      for (const input of this.inputs) {
        pki[input.xid] = await openpgp.readKey({ armoredKey: input.pk })
      }
    })

    let cleartextMessage
    await this.computeStep('sign', async () => {
      cleartextMessage = await openpgp.sign({
        message: this.unsignedMessage,
        signingKeys: this.privateKey
      })
    })

    await this.covertBroadcast('chat', { xid: this.xid, msg: cleartextMessage })
    const chats = await this.receiveAll('chat')

    await this.computeStep('verify', async () => {
      for (const chat of chats) {
        const signedMessage = await openpgp.readCleartextMessage({
          cleartextMessage: chat.msg
        })
        const verificationResult = await openpgp.verify({
          message: signedMessage,
          verificationKeys: pki[chat.xid]
        })
        const { verified } = verificationResult.signatures[0]
        await verified
      }
    })
  }
}

module.exports = SingleChatRoomPKIA

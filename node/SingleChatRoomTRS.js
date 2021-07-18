const Application = require('./Application')
const uuid = require('uuid-random')
const trs = require('trs-js')

class SingleChatRoomTRS extends Application {
  async input () {
    const kp = trs.gen_keypair()
    this.publicKey = kp.public
    this.privateKey = kp.private
    this.message = uuid()
    return { pk: trs.public_to_ascii(this.publicKey) }
  }

  async run () {
    const pki = []
    const issue = 'test'
    await this.computeStep('construct', async () => {
      for (const input of this.inputs) {
        pki.push(input.pk)
      }
    })

    let cleartextMessage
    await this.computeStep('sign', async () => {
      const sig = trs.generate_signature(this.message, pki, issue, this.privateKey)
      cleartextMessage = trs.signature_to_ascii(sig)
    })

    await this.covertBroadcast('chat', { msg: this.message, sig: cleartextMessage })
    const chats = await this.receiveAll('chat')

    await this.computeStep('verify', async () => {
      for (const chat of chats) {
        const sig = trs.ascii_to_signature(chat.sig)
        trs.verify_signature(chat.msg, pki, issue, sig)
      }
    })
  }
}

module.exports = SingleChatRoomTRS

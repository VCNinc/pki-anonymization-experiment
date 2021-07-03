const Application = require('./Application')
const trs = require('trs-js')
const crypto = require('crypto')
const uuid = require('uuid-random')

class SingleValueConsensus extends Application {
  async input () {
    this.kp = trs.gen_keypair()
    this.ascii = trs.public_to_ascii(this.kp.public)
    return this.ascii
  }

  async run () {
    const input = uuid()

    // B1 - generate rs issue, tag
    let issue = crypto.createHash('sha256')
    await this.computeStep('B1-generate-rs-issue-tag', async () => {
      issue.update('SingleValueConsensus')
      this.inputs.sort()
      this.inputs.forEach((input) => {
        issue.update(input)
      })
    })
    issue = issue.digest('hex')

    // B2 - generate rs
    let rs
    await this.computeStep('B2-generate-rs', async () => {
      const sig = trs.generate_signature(input, this.inputs, issue, this.kp.private)
      rs = trs.signature_to_ascii(sig)
    })

    // B3 - broadcast signed input
    await this.covertBroadcast('B3-signed-input', { issue: issue, value: input, rs: rs })
    const messages = await this.receiveAll('B3-signed-input')
    messages.sort((a, b) => (a.value > b.value) ? 1 : -1)

    // B4 - broadcast received messages
    await this.openBroadcast('B4-received-messages', { set: 'hello' })
    const sets = await this.receiveAll('B4-received-messages')
    console.log(sets)

    // B5 - compute set union
    // let union
    // await this.computeStep('B5-compute-set-union', async () => {
    //   const usets = Array.from(new Set(sets))
    //
    // })

    await this.record('messages', messages)
    // await this.record('sets', usets)

    // // A1 - compute output key pair
    // let pkOUT, skOUT
    // await this.computeStep('A1-output-key-pair', async () => {
    //   const kp = trs.gen_keypair()
    //   pkOUT = kp.public
    //   skOUT = kp.private
    // })
    //
    // // A2 - compute public key signature
    // let sigma, ascii
    // await this.computeStep('A2-public-key-signature', async () => {
    //   ascii = trs.public_to_ascii(pkOUT)
    //   const message = await openpgp.createMessage({ text: ascii })
    //   const detachedSignature = await openpgp.sign({
    //     message,
    //     signingKeys: this.key,
    //     detached: true
    //   })
    //   sigma = detachedSignature
    // })
    //
    // // A3 - broadcast signed key
    // await this.openBroadcast('A3-signed-key', { pkIN: this.pkIN, pkOUT: ascii, sigma: sigma, id: this.id })
    // const messages = await this.receiveAll('A3-signed-key')
    //
    // // A4 - remove invalid inputs
    // const messages2 = []
    // const validPKIN = new Set(this.inputs)
    // await this.computeStep('A4-remove-invalid-inputs', async () => {
    //   messages.forEach((message) => {
    //     if (validPKIN.has(message.pkIN)) {
    //       messages2.push(message)
    //     }
    //   })
    // })
    //
    // // A5 - verify signatures
    // const messages3 = []
    // await this.computeStep('A5-verify-signatures', async () => {
    //   for (const message of messages2) {
    //     const signature = await openpgp.readSignature({
    //       armoredSignature: message.sigma
    //     })
    //     const publicKey = await openpgp.readKey({ armoredKey: message.pkIN })
    //     const verified = await openpgp.verify({
    //       message: await openpgp.createMessage({ text: message.pkOUT }),
    //       signature: signature,
    //       verificationKeys: publicKey
    //     })
    //     const { valid } = verified.signatures[0]
    //     if (valid) {
    //       messages3.push(message)
    //     }
    //   }
    // })
    //
    // // A6 - remove duplicates
    // const messages4 = []
    // await this.computeStep('A6-remove-duplicates', async () => {
    //   const seen = new Set()
    //   for (const message of messages3) {
    //     if (validPKIN.has(message.pkIN)) {
    //       messages4.push(message)
    //     } else {
    //       messages4.filter(m => (m.pkIN !== message.pkIN))
    //     }
    //     seen.add(message.pkIN)
    //   }
    // })
    //
    // // A7 - calculate output PKI
    // const PKIOut = {}
    // await this.computeStep('A7-calculate-output', async () => {
    //   for (const message of messages4) {
    //     PKIOut[message.id] = message.pkOUT
    //   }
    // })
    //
    // // A8 - output final PKI
    // await this.computeStep('A8-output-final', async () => {
    //   console.log(skOUT)
    //   await this.record('PKIOut', PKIOut)
    //   await this.record('PKICorrect', PKIOut[this.id] === ascii)
    // })
  }
}

module.exports = SingleValueConsensus

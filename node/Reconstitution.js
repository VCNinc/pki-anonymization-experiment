const Application = require('./Application')
const openpgp = require('openpgp')
const trs = require('trs-js')

class Reconstitution extends Application {
  async input () {
    const { key, publicKeyArmored } = await openpgp.generateKey({
      type: 'ecc',
      curve: 'curve25519',
      userIDs: [{ name: this.id }]
    })
    this.key = key
    this.pkIN = publicKeyArmored
    return publicKeyArmored
  }

  async run () {
    // A1 - compute output key pair
    let pkOUT, skOUT
    await this.computeStep('A1-output-key-pair', async () => {
      const kp = trs.gen_keypair()
      pkOUT = kp.public
      skOUT = kp.private
    })

    // A2 - compute public key signature
    let sigma, ascii
    await this.computeStep('A2-public-key-signature', async () => {
      ascii = trs.public_to_ascii(pkOUT)
      const message = await openpgp.createMessage({ text: ascii })
      const detachedSignature = await openpgp.sign({
        message,
        signingKeys: this.key,
        detached: true
      })
      sigma = detachedSignature
    })

    // A3 - broadcast signed key
    await this.openBroadcast('A3-signed-key', { pkIN: this.pkIN, pkOUT: ascii, sigma: sigma, id: this.id })
    const messages = await this.receiveAll('A3-signed-key')

    // A4 - remove invalid inputs
    const messages2 = []
    const validPKIN = new Set(this.inputs)
    await this.computeStep('A4-remove-invalid-inputs', async () => {
      messages.forEach((message) => {
        if (validPKIN.has(message.pkIN)) {
          messages2.push(message)
        }
      })
    })

    // A5 - verify signatures
    const messages3 = []
    await this.computeStep('A5-verify-signatures', async () => {
      for (const message of messages2) {
        const signature = await openpgp.readSignature({
          armoredSignature: message.sigma
        })
        const publicKey = await openpgp.readKey({ armoredKey: message.pkIN })
        const verified = await openpgp.verify({
          message: await openpgp.createMessage({ text: message.pkOUT }),
          signature: signature,
          verificationKeys: publicKey
        })
        const { valid } = verified.signatures[0]
        if (valid) {
          messages3.push(message)
        }
      }
    })

    // A6 - remove duplicates
    const messages4 = []
    await this.computeStep('A6-remove-duplicates', async () => {
      const seen = new Set()
      for (const message of messages3) {
        if (validPKIN.has(message.pkIN)) {
          messages4.push(message)
        } else {
          messages4.filter(m => (m.pkIN !== message.pkIN))
        }
        seen.add(message.pkIN)
      }
    })

    // A7 - calculate output PKI
    const PKIOut = {}
    await this.computeStep('A7-calculate-output', async () => {
      for (const message of messages4) {
        PKIOut[message.id] = message.pkOUT
      }
    })

    // A8 - output final PKI
    await this.computeStep('A8-output-final', async () => {
      console.log(skOUT)
      await this.record('PKIOut', PKIOut)
      await this.record('PKICorrect', PKIOut[this.id] === ascii)
    })
  }
}

module.exports = Reconstitution

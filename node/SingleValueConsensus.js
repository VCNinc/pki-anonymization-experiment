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
    const pki = this.inputs

    // B1 - generate rs issue, tag
    let issue = crypto.createHash('sha256')
    await this.computeStep('B1-generate-rs-issue-tag', async () => {
      issue.update('SingleValueConsensus')
      pki.sort()
      pki.forEach((input) => {
        issue.update(input)
      })
    })
    issue = issue.digest('hex')

    // B2 - generate rs
    let rs
    await this.computeStep('B2-generate-rs', async () => {
      const sig = trs.generate_signature(input, pki, issue, this.kp.private)
      rs = trs.signature_to_ascii(sig)
    })

    // B3 - broadcast signed input
    await this.covertBroadcast('B3-signed-input', { issue: issue, value: input, rs: rs })
    const messages = await this.receiveAll('B3-signed-input')
    messages.sort((a, b) => (a.value > b.value) ? 1 : -1)

    // B4 - broadcast received messages
    await this.threePhaseBroadcast('B4-received-messages', { set: messages })
    const sets = await this.receiveAll('B4-received-messages')

    // B5 - compute set union
    let union
    await this.computeStep('B5-compute-set-union', async () => {
      union = new Set()
      sets.forEach((set) => {
        set.set.forEach((item) => {
          union.add(item)
        })
      })
      union = Array.from(union)
    })

    // B6 - verify all signatures
    let verified
    await this.computeStep('B6-verify-all-signatures', async () => {
      // union.forEach((item) => {
      //   if (typeof item.rs === "string") item.rs = trs.ascii_to_signature(item.rs);
      // })
      verified = union.filter(item => {
        if (item.issue !== issue) return false
        const sig = trs.ascii_to_signature(item.rs)
        return trs.verify_signature(item.value, pki, issue, sig)
      })
    })

    function getRemove (unlinked, total) {
      const remove = new Set()
      if (unlinked.size - remove.size <= total) return remove
      for (let i = 0; i < verified.length - 1; i++) {
        for (let j = i + 1; j < verified.length; j++) {
          const s1 = verified[i]; const s2 = verified[j]
          const sig1 = trs.ascii_to_signature(s1.rs)
          const sig2 = trs.ascii_to_signature(s2.rs)
          if (trs.trace_signature(s1.value, sig1, s2.value, sig2, pki, issue) !== 'indep') {
            remove.add(s1)
            remove.add(s2)
            if (unlinked.size - remove.size <= total) return remove
          }
        }
      }
      return remove
    }

    // B7 - check all links
    let unlinked
    await this.computeStep('B7-check-all-links', async () => {
      unlinked = new Set(verified)
      const remove = getRemove(unlinked, this.total)
      remove.forEach((el) => {
        unlinked.delete(remove)
      })
    })

    // B8 - output values
    await this.computeStep('B8-output-values', async () => {
      const values = Array.from(unlinked).map(i => i.value)
      await this.assert('valid', values.includes(input))
      await this.record('values', values)
    })

    await this.record('messages', messages)
    await this.record('sets', sets)
    await this.record('union', union)
    await this.record('verified', verified)
    await this.record('unlinked', unlinked)
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

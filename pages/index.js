import Head from 'next/head'
import styles from '../styles/Home.module.css'
import HexEditor from 'react-hex-editor';
import React from 'react';
import $ from 'jquery';


class EthRPC {

  constructor(endpoint) {
    this.id = 0;
    this.endpoint = endpoint;
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }

  call(method, params) {
    const that = this;
    return new Promise(function (resolve, reject) {

      $.ajax({
        url: that.endpoint,

        data: JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: that.id++ }),  // id is needed !!

        type: "POST",

        dataType: "json",
        success: function (data) { resolve(data.result); },
        error: function (err) { reject(err) }
      });
    });
  }

  callBatch(method, paramsBatch) {
    return Promise.all(paramsBatch.map(p => this.call(method, p)));
  }

  getStorageAt(target, start, num, atBlock) {
    atBlock = atBlock || "latest";
    start = start || 0;
    num = num || 1;
    let params = [...Array(num).keys()].map((idx) => [target, (start + idx).toString(), atBlock])
    return this.callBatch("eth_getStorageAt", params);
  }

}


class HexViewWithForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "https://ropsten.infura.io/v3/fd9e225bc1234f49b48b295c611078eb",
      startslot: 0,
      numslots: 10,
      target: "0x3a6CAE3af284C82934174F693151842Bc71b02b2",
      atBlock: "latest",
      data: new Array(),
      nonce: 0,
      dirty: true,
      api: new EthRPC()
    };
  }


  shouldComponentUpdate() {
    return true;
  }

  shouldUpdateView() {
    return this.state.dirty && this.state.endpoint.length && this.state.numslots != 0 && this.state.target.length == 42;
  }

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {

    if (!this.shouldUpdateView()) {
      console.log("no update")
      return;
    }
    console.log("updated")


    function hexStringToByteArray(hexString) {
      if (hexString.length % 2 !== 0) {
        return [];
      }/* w w w.  jav  a2 s .  c o  m*/
      var numBytes = hexString.length / 2;
      var byteArray = new Array(numBytes);
      for (var i = 0; i < numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
      }
      return byteArray;
    }

    if (this.state.dirty) {
      this.setState({ dirty: false });
      //fetch data
      this.state.api.setEndpoint(this.state.endpoint);
      this.state.api.getStorageAt(this.state.target, this.state.startslot, this.state.numslots, this.state.atBlock).then(arr => {
        let flatData = arr.reduce((flat, toFlatten) => flat.concat(hexStringToByteArray(toFlatten.replace("0x", ""))), []);
        this.setState({
          data: flatData,
          nonce: this.state.nonce + 1, //force render
        });
      });
    }
  }

  render() {

    function handleSetValue(offset, value) {
      //this.setState({data[offset] = value;
      //this.state.nonce += 1;
      console.log(offset, value)
    }

    let chainPrefix = this.state.endpoint.match(/https?:\/\/(.*).infura.io.*/);
    if (chainPrefix && chainPrefix.length >= 2) {
      chainPrefix = chainPrefix[1].toLowerCase().trim();
    } else {
      chainPrefix = "";
    }

    return (
      <div>
        <div>
          <form>
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>First Slot</th>
                  <th># Slots</th>
                  <th>at Block</th>
                  <th>API-Endpoint</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input type="text" name="target"
                      size={50}
                      pattern="0x[0-9a-FA-F]{40}" title="Target must be an Ethereum Address starting with 0x..."
                      value={this.state.target}
                      onChange={(e) => this.setState({ target: e.target.value.trim(), dirty: true })} />
                  </td>
                  <td>
                    <input type="text" name="startslot"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.startslot}
                      onChange={(e) => this.setState({ startslot: !isNaN(parseInt(e.target.value.trim())) ? parseInt(e.target.value.trim()) : 0, dirty: true })}
                    />
                  </td>
                  <td>
                    <input type="text" name="numslots"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.numslots}
                      onChange={(e) => this.setState({ numslots: !isNaN(parseInt(e.target.value.trim())) ? parseInt(e.target.value.trim()) : 0, dirty: true })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="atBlock"
                      pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                      size={10}
                      value={this.state.atBlock}
                      onChange={(e) => e.target.value.trim() && this.setState({ atBlock: e.target.value.trim(), dirty: true })}
                    />
                  </td>
                  <td>
                    <div title="Get Api Key">
                    <input
                      type="text"
                      name="endpoint"
                      pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                      size={70}
                      value={this.state.endpoint}
                      onChange={(e) => e.target.value.trim() && this.setState({ endpoint: e.target.value.trim(), dirty: true })}
                    />
                    &nbsp;
                    <a href="https://infura.io/register">ⓘ</a>
                    </div>
                    
                  </td>
                  <td>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>
        <div>
          <div>
            <a href={`https://${chainPrefix != 'mainnet' ? `${chainPrefix}.` : ''}etherscan.io/address/${this.state.target}`}>🌐 Etherscan</a>
            {/*   &nbsp;<a href={`https://dashboard.tenderly.co/contract/${chainPrefix}/${this.state.target}`}>🟣 Tenderly</a> */}
          </div>
          <HexEditor
            className="hexview"
            columns={0x20}
            height={600}
            data={this.state.data}
            nonce={this.state.nonce}
            showAscii={true}
            showColumnLabels={true}
            showRowLabels={true}
            highlightColumn={true}
            onSetValue={handleSetValue}
            readOnly={true}
            theme={{}}
          />
        </div>
      </div>
    );
  }
}



export default function Home() {

  return (
    <div className={styles.container}>
      <Head>
        <title>Smart Contract Storage Viewer</title>
        <meta name="description" content="Ethereum Smart Contract Storage Hex Viewer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HexViewWithForm />
      <hr></hr>
      <sub><a  href="https://github.com/tintinweb">@tintinweb ❤️</a></sub>
    </div>

  )
}
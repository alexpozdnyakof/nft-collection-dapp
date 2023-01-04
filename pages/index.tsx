import Head from 'next/head'
import Image from 'next/image'
import { Inter } from '@next/font/google'
import styles from '../styles/Home.module.css'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Contract, providers, utils } from 'ethers'
import { ABI, NFT_CONTRACT_ADDRESS } from './constants'
import Web3Modal from "web3modal";

const inter = Inter({ subsets: ['latin'] })

function getNftContract(provider: providers.JsonRpcSigner | providers.Web3Provider){
  return new Contract(NFT_CONTRACT_ADDRESS, ABI, provider);
}

function Button({children, onClick }: PropsWithChildren & JSX.IntrinsicElements['button']){
  return <button className={styles.button} onClick={onClick}>{children}</button>
}
function Description({children}: PropsWithChildren){
  return(<div>
    <div className={styles.description}>{children}</div>
  </div>)
}


export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [presaleStarted, setPresaleStarted] = useState(false)
  const [presaleEnded, setPresaleEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [tokenIdsMinted, setTokenIdsMinted] = useState('0')
  const web3ModalRef = useRef<{connect: () => any}>()

  async function getProvider(){
    const provider = await web3ModalRef.current?.connect()
    const web3Provider = new providers.Web3Provider(provider)
    const { chainId }  = await web3Provider.getNetwork()
    if (chainId !== 5) throw new Error('Connection Error: only Goerli allowed')

    return web3Provider
  }

  async function getSigner(){
    const provider = await getProvider()
    return provider.getSigner()
  }


  async function presaleMint(){
    try {
      const signer = await getSigner()
      const nftContract = getNftContract(signer);

      const tx = await nftContract.presaleMint({
        value: utils.parseEther('0.01')
      })
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert('You succesfully minted Next Token')
    } catch(error){
      console.error(error)
    }
  }

  async function publicMint(){
    try{
      const signer = await getSigner()
      const nftContract = getNftContract(signer);

      // То что действительно полезно
      const tx = await nftContract.mint({
        value: utils.parseEther('0.01')
      })

      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert('You succesfully minted Next Token')
    } catch(error) {
      console.error(error)
    }
  }

  async function connectWallet(){
    try {
      await getProvider()
      setWalletConnected(true)
    } catch (error) {
      console.error(error)
    }
  }

  async function startPresale(){
    try {
      const signer = await getSigner()
      const nftContract = getNftContract(signer)

      // То что действительно полезно
      const tx = await nftContract.startPresale()


      setLoading(true)
      await tx.wait()
      setLoading(false)
      await checkIfPresaleStarted()
    } catch(error){
      console.error(error)
    }
  }

  async function checkIfPresaleStarted(){
    try{
      const signer = await getSigner()
      const nftContract = getNftContract(signer)

      // То что действительно полезно
      const _presaleStarted = await nftContract.presaleStarted()
      if(!_presaleStarted) {
        await getOwner()
      }

      setPresaleStarted(_presaleStarted)
      return _presaleStarted
    } catch(error){
      console.error(error)
      return false
    }
  }

  async function checkIfPresaleEnded() {
    try {
      const provider = await getProvider()
      const nftContract = getNftContract(provider)

      // То что действительно полезно
      const _presaleEnded = await nftContract.presaleEnded()

      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000))

      if(hasEnded){
        setPresaleEnded(true)
      } else {
        setPresaleEnded(false)
      }

      return hasEnded
    } catch(error){
      console.error(error)
      return false
    }
  }


  const getOwner = async () => {
    try {
      const provider = await getProvider();
      const nftContract = getNftContract(provider)
      // call the owner function from the contract
      const _owner = await nftContract.owner();
      // We will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getSigner();
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (error) {
      console.error(error);
    }
  };


  async function getTokenIdsMinted(){
    try {
      const provider = await getProvider()
      const nftContract = getNftContract(provider)

      // То что действительно полезно
      const _tokenIds = await nftContract.tokenIds()

      setTokenIdsMinted(_tokenIds.toString())
    } catch (error){
      console.error(error)
    }
  }

  async function init(){
    const _presaleStarted = await checkIfPresaleStarted();
    if(_presaleStarted){
      await checkIfPresaleEnded()
    }

    await getTokenIdsMinted()

    const presaleEdnedInterval = setInterval(async function () {
      const _presaleStarted = await checkIfPresaleStarted()
      if(_presaleStarted){
        const _presaleEnded = await checkIfPresaleEnded()
        if(_presaleEnded){
          clearInterval(presaleEdnedInterval)
        }
      }
    }, 5*1000)

    setInterval(async function(){
      await getTokenIdsMinted()
    }, 5*1000)

  }
  useEffect(() => {
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: 'goerli',
        providerOptions: {},
        disableInjectedProvider: false
      })
      connectWallet()
      init()
    }
  }, [walletConnected, init, connectWallet])



  const renderPageContent = () => {
    if(!walletConnected) return <Button onClick={connectWallet}>Connect your wallet</Button>
    if(isOwner && !presaleStarted) return <Button onClick={startPresale}>Start Presale!</Button>
    if(presaleStarted && presaleEnded) return <Button onClick={publicMint}>Public Mint</Button>

    if(loading) return <Description>Loading...</Description>
    if(!presaleStarted) return <Description>Presale hasnt started!</Description>

    if(presaleStarted && !presaleEnded) {
      return (
        <div>
          <Description>Presale has started!! 🥳</Description>
          <Button onClick={presaleMint}>Presale Mint 🚀</Button>
        </div>
      )
    }
  }

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.description}>
          <p>
            Get started by editing&nbsp;
            <code className={styles.code}>pages/index.tsx</code>
          </p>
          <div>
            <a
              href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              By{' '}
              <Image
                src="/vercel.svg"
                alt="Vercel Logo"
                className={styles.vercelLogo}
                width={100}
                height={24}
                priority
              />
            </a>
          </div>
        </div>
        <Description>{tokenIdsMinted}/20 have been minted</Description>
        {renderPageContent()}
        <div>
          <Image className={styles.image} src="/nexttokens/0.svg" alt="Next tokens 0" width={640} height={420}/>
        </div>
        <div className={styles.center}>
          <Image
            className={styles.logo}
            src="/next.svg"
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
          />
          <div className={styles.thirteen}>
            <Image
              src="/thirteen.svg"
              alt="13"
              width={40}
              height={31}
              priority
            />
          </div>
        </div>

        <div className={styles.grid}>
          <a
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Docs <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Find in-depth information about Next.js features and&nbsp;API.
            </p>
          </a>

          <a
            href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Learn <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Learn about Next.js in an interactive course with&nbsp;quizzes!
            </p>
          </a>

          <a
            href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Templates <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Discover and deploy boilerplate example Next.js&nbsp;projects.
            </p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Deploy <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Instantly deploy your Next.js site to a shareable URL
              with&nbsp;Vercel.
            </p>
          </a>
        </div>
      </main>
    </>
  )
}

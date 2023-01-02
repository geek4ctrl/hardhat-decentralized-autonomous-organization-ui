import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {

  const [treasuryBalance, setTreasuryBalance] = useState("0");

  const [numProposals, setNumProposals]: any = useState("0");

  const [proposals, setProposals] = useState([]);

  const [nftBalance, setNftBalance] = useState(0);

  const [fakeNftTokenId, setFakeNftTokenId] = useState("");

  const [selectedTab, setSelectedTab] = useState("");

  const [loading, setLoading] = useState(false);

  const [walletConnected, setWalletConnected] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const web3ModalRef: any = useRef();

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getDAOOwner = async () => {
    try {
      const signer: any = await getProviderOrSigner(true);
      const contract = getDaoContractInstance(signer);

      const _owner = await contract.owner();

      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true)
      }

    } catch (error) {
      console.error(error);
    }
  }

  const withdrawDAOEther = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = getDaoContractInstance(signer);

      const tx = await contract.withdrawEther();
      setLoading(true);
      await tx.wait();
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      );
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const gettUserNFTBalance = async () => {
    try {
      const signer: any = await getProviderOrSigner(true);
      const nftContract = getCryptodevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  };

  const fetchProposalById = async (id: any) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  }

  const fetchAllProposals = async () => {
    try {
      const proposals: any = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  }

  const voteOnProposal = async (proposalId: any, _vote: any) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  const executeProposal = async (proposalId: any) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
      getDAOTreasuryBalance();
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Please switch to the Goerli network!");
      throw new Error("Please switch to the Goerli network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const getDaoContractInstance = (providerOrSigner: any) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    );
  };

  const getCryptodevsNFTContractInstance = (providerOrSigner: any) => {
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    );
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      })
    }
  }, [walletConnected]);

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  function renderCreateProposalTab() {
    if (loading) {
      return <div className={styles.description}>Loading... Waiting for transaction...</div>
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input placeholder="0" type="number" onChange={(e) => setFakeNftTokenId(e.target.value)} />
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      )
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p: any, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {
                p.deadline.getTime() > Date.now() && !p.executed ? (
                  <div className={styles.flex}>
                    <button className={styles.button2} onClick={() => voteOnProposal(p.proposalId, "YAY")}>
                      Vote YAY
                    </button>
                    <button className={styles.button2} onClick={() => voteOnProposal(p.proposalId, "NAY")}>
                      Vote NAY
                    </button>
                  </div>
                ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                  <div className={styles.flex}>
                    <button className={styles.button2} onClick={() => executeProposal(p.proposal)}>
                      Execute Proposal{" "}
                      {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                    </button>
                  </div>
                ) : (
                  <div className={styles.description}>Proposal Executed</div>
                )
              }
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}> Welcome to the DAO</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button className={styles.button} onClick={() => setSelectedTab("Create Proposal")}>
              Create Proposal
            </button>

            <button className={styles.button} onClick={() => setSelectedTab("View Proposals")}>
              View Proposals
            </button>
          </div>

          {renderTabs()}

          {isOwner ? (
            <div>{loading ? <button className={styles.button}>Loading...</button> : <button className={styles.button} onClick={withdrawDAOEther}>Withdraw DAO ETH</button>}</div>
          ) : ("")}
        </div>
        <div>
          <img className={styles.image} src="/cryptodevs/0.svg" />
        </div>

        <footer className={styles.footer}>
          Made with Love by Crypto Devs
        </footer>
      </div>
    </div>
  )

}
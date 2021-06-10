import Header from '../components/Header';
import Head from '../components/Head';
import Footer from '../components/Footer';

export default function Disclaimer() {
    return (
        <>
            <Head />
            <div>
                <Header />
                <div className="max-w-screen-xl m-auto p-4 min-content-height">
                    <p className="mb-4">
                        Everyone using this tool does so at his/her own risk.
                        Neither I nor Web3 Foundation guarantee that any data collected is valid and every user is responsible for double-checking the results of this tool.
                        In addition to potential bugs in this code,
                        you are relying on third-party data: Subscan's API is used to collect staking data and CoinGecko's API is used to collect daily price data.
                    </p>

                    <p>
                        <span className="font-bold">This is no tax advice:</span> Every user is
                    responsible to do his/her own research about how stake rewards are taxable in his/her regulatory framework.
                    </p>

                </div>
                <Footer />
            </div>
        </>
    )
}
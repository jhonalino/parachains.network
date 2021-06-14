import { Footer, Header, Head, Nav } from '../../../../components';

function Campaign(props) {

    const { loadingText } = props;

    return (
        <>
            <Head />
            <div className="">
                <Header />
                <Nav />
                <div className="max-w-screen-2xl m-auto w-full min-content-height p-4">
                    coming soon
                    {loadingText}...
                </div>
                <Footer />
            </div>
        </>
    )

}

export default Campaign;
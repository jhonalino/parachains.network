import { Footer, Header, Head, Nav } from './';

export default function Loader(props) {

	const { loadingText } = props;

	return (
		<>
			<Head />
			<div className="">
				<Header />
				<Nav />
				<div className="max-w-screen-2xl m-auto w-full min-content-height p-4">
					{loadingText}...
				</div>
				<Footer />
			</div>
		</>
	);

}
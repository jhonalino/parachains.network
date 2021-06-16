

import Link from 'next/link';

import { useEffect, useMemo, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { useRouter } from 'next/router'
import { Footer, Header, Head, Nav, Loader } from '../../../components';

import chainsConfig from '../../../configs/chainsKusama';

function createChildKey(trieIndex) {
	return u8aToHex(
		u8aConcat(
			':child_storage:default:',
			blake2AsU8a(
				u8aConcat('crowdloan', trieIndex.toU8a())
			)
		)
	);
}

function Parathreads() {

	const router = useRouter();

	const [loadingText, setLoadingText] = useState('');

	const [loading, setLoading] = useState(true);

	const [api, setApi] = useState(null);

	const [parathreads, setParathreads] = useState([]);

	useEffect(() => {

		async function useApi() {

			setLoadingText('Connecting to kusama node');

			let wsUrl = 'wss://kusama-node.polkaview.network';

			wsUrl = 'wss://kusama-rpc.polkadot.io';

			// wsUrl = 'ws://104.238.205.8:9302';

			const wsProvider = new WsProvider(wsUrl);

			const api = new ApiPromise({ provider: wsProvider });

			await api.isReady;
			// expose api for testing
			window.api = api;

			setApi(api);
		}

		useApi();

	}, []);

	useEffect(() => {
		if (!api) {
			return;
		}

		async function getParathreads() {

			var paraLifecycleEntries = await api.query.paras.paraLifecycles.entries();

			var parathreads = paraLifecycleEntries
				.map(function ([{ args: [paraId] }, optValue]) {

					const value = optValue.unwrap();

					return value && (
						value.isParathread ||
						value.isUpgradingToParachain ||
						value.isOutgoingParathread ||
						value.isOnboarding
					)
						? {
							lifecycle: value.toString(),
							...(chainsConfig.filter((c) => paraId.toString() == c.paraId)[0] || { paraId: paraId.toString() })
						}
						: null;

				})
				.filter(parathread => !!parathread)
				.sort(({ paraId: a }, { paraId: b }) => a - b);


			setParathreads(parathreads);
			setLoading(false);

		}

		getParathreads();


	}, [api])

	if (loading) {
		return <Loader loadingText={loadingText} />
	}

	return (
		<>
			<Head title="PARACHAINS.NETWORK" />
			<div className="">
				<Header />
				<Nav />
				<div className="max-w-screen-2xl m-auto w-full min-content-height overflow-x-auto">
					<div className="flex p-4 overflow-x-auto">
						<table className="min-w-max w-full parathreads">
							<thead>
								<tr>
									<th className="text-left" colSpan={2}>Parathreads</th>
									<th className="text-left"></th>
									<th className="text-left" >Lifecycle</th>
								</tr>
							</thead>
							<tbody>
								{parathreads.map(function (parathread) {

									const { paraId, logo, text, lifecycle } = parathread;

									console.log(parathread);

									return (
										<tr key={paraId} >
											<td className="">
												<div className="flex items-center justify-center flex-col">
													<div className="h-12 rounded-full">
														{logo ? (
															<img className="h-full rounded-full" src={`/logos/chains/${logo}`} alt={text} />
														) : (
															<div className="h-full rounded-full w-12 flex justify-center items-center border border-para">{paraId}</div>
														)}
													</div>
													<span className="text-sm">
														{paraId}
													</span>
												</div>
											</td>
											<td className="text-left text-1xl min-w-max whitespace-nowrap">
												{text || paraId}
											</td>
											<td className="text-left text-1xl w-full">
											</td>
											<td className="text-left text-1xl">
												{lifecycle}
											</td>
										</tr>
									);


								})}
							</tbody>
						</table>
					</div>
				</div>
				<Footer />
			</div>
		</>
	);

}

export default Parathreads;
import Link from 'next/link';

export default function Footer() {
    return (
        <div className="w-full border border-t border-gray-700 border-opacity-10 mt-2 bg-white">
            <div className="max-w-screen-xl m-auto flex flex-wrap justify-between items-center h-full p-2 overflow-x-auto">
                <p>
                    <Link href="/">
                        <a>
                            <span className="uppercase">parachains</span>
                        </a>
                    </Link> ©2021 by
                    <Link href="https://polkaview.network/">
                        <a className="ml-1">polkaview</a>
                    </Link>
                </p>
                <div className="flex flex-col text-gr">
                    <div>
                        <span className="mr-2" style={{ color: '#e6007a' }}>TIP (DOT):</span><span>13Tbq9Exz6r9GzEYxiey6QEQPrnhvecxNv2SPiSMny6CFWqY</span>
                    </div>
                    <div>
                        <span className="mr-2" style={{ color: '#FF8F00' }}>TIP (KSM):</span><span>F2vM8Kmkgbbb73UmnR1rCmFgq5J31szko8hd5ixigHApDNY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
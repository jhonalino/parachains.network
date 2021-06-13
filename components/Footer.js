import Link from 'next/link';

export default function Footer() {
    return (
        <div className="w-full border border-t border-gray-700 border-opacity-10 mt-2 bg-black">
            <div className="max-w-screen-xl m-auto flex flex-wrap justify-between items-center h-full p-2 overflow-x-auto">
                <p className="text-para">
                    <Link href="/">
                        <a>
                            <span className="uppercase">parachains 2021</span>
                        </a>
                    </Link> by
                    <Link href="https://polkaview.network/">
                        <a className="ml-1">polkaview</a>
                    </Link>
                </p>
                <div className="flex flex-col text-gray-300">
                    tips are welcome :)
                    <div>
                        <span className="mr-2 whitespace-nowrap" style={{ color: '#e6007a' }}>tip (DOT):</span><span className="text-gray-300">13Tbq9Exz6r9GzEYxiey6QEQPrnhvecxNv2SPiSMny6CFWqY</span>
                    </div>
                    <div>
                        <span className="mr-2 whitespace-nowrap" style={{ color: '#FF8F00' }}>tip (KSM):</span><span className="text-gray-300">F2vM8Kmkgbbb73UmnR1rCmFgq5J31szko8hd5ixigHApDNY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
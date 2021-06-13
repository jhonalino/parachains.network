import Link from 'next/link';

export default function Header() {
    return (
        <div className="h-16 w-full border border-b border-gray-700 border-opacity-10 mb-2 bg-black">
            <div className="max-w-screen-2xl m-auto flex justify-between items-center h-full p-2">
                <Link href="/">
                    <a>
                        <h1 className="uppercase text-2xl text-para font-bold">parachains</h1>
                    </a>
                </Link>

                <Link href="https://github.com/jhonalino/parachains.network">
                    <a className="ml-1">
                        <img src="/github.png" alt="github logo" className="w-8" />
                    </a>
                </Link>
            </div>
        </div>
    );
}
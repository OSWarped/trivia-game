interface ConnectionBannerProps {
  connectionStatus: string;
}

export default function ConnectionBanner({
  connectionStatus,
}: ConnectionBannerProps) {
  if (connectionStatus !== 'disconnected') {
    return null;
  }

  return (
    <div className="mt-4 text-center text-yellow-500 md:col-span-12">
      Reconnecting...
    </div>
  );
}